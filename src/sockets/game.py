from flask import session, current_app
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio, mysql
import src.utils as utils
from src.typings import SOSFlask
from pymysql.cursors import Cursor
from typing import Optional
import gevent

current_app: SOSFlask

PATTERN = "SOS"
LIST_INDICES = (
    (-1, 0, 1),
    (-15, 0, 15),
    (-16, 0, 16),
    (-14, 0, 14),
    (-2, -1, 0),
    (2, 1, 0),
    (-30, -15, 0),
    (30, 15, 0),
    (-32, -16, 0),
    (32, 16, 0),
    (-28, -14, 0),
    (28, 14, 0),
)
LIST_INDICES_MAX_HORIZOTAL_SPACE = (
    1,
    0,
    1,
    1,
    -2,
    2,
    0,
    0,
    -2,
    2,
    2,
    -2,
)


@socketio.on("connect", namespace="/game")
def game_connect():
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    room_id = session["room_id"]
    username = session["username"]
    game = current_app.games.get(room_id, None)

    if game is None:
        emit("game_not_found")
        return
    elif game.has_ended():
        emit("game_end", {"winner": game.get_winner()})
        return

    # Join Logic
    is_visitor = username not in game.get_allowed_players()
    is_added = game.add_player(username)
    cells_str = utils.cells_to_number_as_str(
        cells=game.get_cells(), states=game.get_states()
    )
    allowed_players = game.get_allowed_players_as_list()

    emit(
        "self_init",
        {
            "current_player": game.get_current_player(),
            "players": allowed_players,
            "players_statuses": utils.get_players_statuses_as_str(
                players=allowed_players,
                fn_is_online=game.is_player_online,
                fn_is_playing=game.is_player_playing,
            ),
            "visitors": game.get_visitors(),
            "surrenders": f"{game.get_number_of_surrenders()}/{game.get_max_surrenders()}",
            "playing_status": game.is_player_playing(player=username),
            "surrended_status": game.is_player_surrended(player=username),
            "scores": game.get_scores_as_str(),
            "cells": cells_str,
        },
    )

    if game.is_timer_enabled():
        emit("self_init_timer", game.get_timer().get_target_timestamp())

    join_room(room=room_id)

    if is_visitor:
        game.increase_visitors()
        emit(
            "visitor_join",
            {
                "visitors": game.get_visitors(),
            },
            to=room_id,
        )

    if not is_added:
        return

    emit(
        "user_join",
        {
            "username": username,
            "playing_status": game.is_player_playing(player=username),
            "surrenders": f"{game.get_number_of_surrenders()}/{game.get_max_surrenders()}",
        },
        to=room_id,
        include_self=False,
    )


@socketio.on("disconnect", namespace="/game")
def game_disconnect():
    room_id = session["room_id"]
    username = session["username"]
    game = current_app.games.get(room_id, None)

    if game is None:
        return
    elif game.has_ended():
        emit("game_end", {"winner": game.get_winner()})
        return

    # Leave Logic
    current_player = game.get_current_player()
    is_visitor = username not in game.get_allowed_players()
    is_removed = game.remove_player(username)

    if is_visitor:
        game.decrease_visitors()
        emit(
            "visitor_leave",
            {
                "visitors": game.get_visitors(),
            },
            to=room_id,
        )

    leave_room(room=room_id)
    if not is_removed:
        return

    if game.get_current_player() != current_player and game.is_timer_enabled():
        game.get_timer().reset()
        emit("user_reset_timer", game.get_timer().get_target_timestamp(), to=room_id)

    emit(
        "user_leave",
        {
            "username": username,
            "current_player": game.get_current_player(),
            "surrenders": f"{game.get_number_of_surrenders()}/{game.get_max_surrenders()}",
        },
        to=room_id,
        include_self=False,
    )

    # Surrend Logic
    gevent.sleep(seconds=30)
    if (
        game.get_number_of_players() < 1
        or game.get_number_of_surrenders() < game.get_max_surrenders()
        or game.is_ending()
    ):
        return

    game.turn_on_ending()

    winner = game.get_player_with_max_score()
    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()
    
    cursor.execute('UPDATE rooms SET winner = %s WHERE id = %s', [winner, room_id])
    conn.commit()
    cursor.close()
    
    game.end_game(winner=winner)

    room = current_app.rooms.get(room_id)
    if room is not None:
        room.end_room(winner=winner)

    emit("game_end", {"winner": winner}, to=room_id)


@socketio.on("play", namespace="/game")
def game_play(json: dict[str, object]):
    room_id: Optional[int] = session.get("room_id", 0)
    game = current_app.games.get(room_id)
    username: Optional[str] = session.get("username")
    is_visitor = username not in game.get_allowed_players()

    # Validation
    if game is None:
        emit("game_not_found", to=room_id)
        return

    if (
        username is None
        or username != game.get_current_player()
        or is_visitor
        or game.is_playing()
        or game.is_ending()
    ):
        emit("self_init_timer", game.get_timer().get_target_timestamp())
        return

    if game.get_number_of_active_players() < 2:
        emit("game_require_2_players", to=room_id)
        return

    # Play Logic
    game.enable_playing()

    old_current_player = game.get_current_player()
    is_turning_player = False
    char_index: Optional[int] = json.get("char_index")
    char: Optional[str] = json.get("char")
    cells = game.get_cells()
    states = game.get_states()
    changed_states = []
    added_score = 0

    if char_index is None or char not in {"S", "O"}:
        return

    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()
    min_i, max_i = utils.get_min_max_index(index=char_index)
    start_range, stop_range = (4, 12) if char == "S" else (0, 4)

    cells[char_index] = char
    for indices_i in range(start_range, stop_range):
        raw_indices = LIST_INDICES[indices_i]
        max_space = LIST_INDICES_MAX_HORIZOTAL_SPACE[indices_i]
        indices = list(map(lambda i: char_index + i, raw_indices))
        min_crrnt_i, max_crrnt_i = utils.get_min_max(array=indices)
        is_out_bound = (
            (char_index + max_space) > max_i
            if max_space > 0
            else (char_index + max_space) < min_i
        )

        if min_crrnt_i < 0 or max_crrnt_i >= len(cells) or is_out_bound:
            continue

        selected_pattern = "".join([cells[i] for i in indices])
        is_all_chars_active = all([states[i] == "1" for i in indices])

        if selected_pattern != PATTERN or is_all_chars_active:
            continue

        states[indices[0]] = "1"
        states[indices[1]] = "1"
        states[indices[2]] = "1"
        changed_states.extend(indices)
        added_score += 1

    game.increment_filled_cells()
    game.add_score(player=username, score=added_score)

    if added_score < 1 and old_current_player == game.get_current_player():
        is_turning_player = True
        game.turn_current_player()

    cursor.execute(
        "UPDATE scores SET score = score + %s WHERE room_id = %s AND username = %s",
        [added_score, room_id, username],
    )
    cursor.execute(
        "UPDATE rooms SET cells = %s, states = %s WHERE id = %s",
        [game.get_cells_as_str(), game.get_states_as_str(), room_id],
    )

    conn.commit()
    cursor.close()

    game.disable_playing()

    emit(
        "user_play",
        {
            "username": username,
            "char_index": char_index,
            "char": char,
            "changed_states": changed_states,
            "added_score": added_score,
            "current_player": game.get_current_player(),
        },
        to=room_id,
    )

    # End Game Logic
    if game.is_all_filled():
        game.turn_on_ending()

        winner = game.get_player_with_max_score()
        conn = mysql.get_db()
        cursor: Cursor = conn.cursor()
        
        cursor.execute('UPDATE rooms SET winner = %s WHERE id = %s', [winner, room_id])
        conn.commit()
        cursor.close()
        
        game.end_game(winner=winner)

        room = current_app.rooms.get(room_id)
        if room is not None:
            room.end_room(winner=winner)

        emit("game_end", {"winner": winner}, to=room_id)
        return

    # Reset Timer's Logic
    if game.is_timer_enabled() and (
        (added_score <= 0 and is_turning_player)
        or (
            added_score > 0
            and game.is_reset_timer_when_scored()
            and old_current_player == game.get_current_player()
        )
    ):
        game.get_timer().reset()
        emit("user_reset_timer", game.get_timer().get_target_timestamp(), to=room_id)


@socketio.on("turn_playing_status", namespace="/game")
def game_turn_playing_status():
    room_id = session["room_id"]
    username = session["username"]
    game = current_app.games.get(room_id)

    if game is None:
        emit("game_not_found", to=room_id)
        return

    # Validaiton
    is_visitor = username not in game.get_allowed_players()
    is_surrended = game.is_player_surrended(player=username)
    if is_visitor or not is_surrended:
        return emit(
            "self_turn_playing_status",
            {
                "success": False,
                "status": True,
            },
        )

    # Turning's Logic
    new_playing_status = game.turn_playing_status(player=username)
    emit(
        "self_turn_playing_status",
        {
            "success": True,
            "status": new_playing_status,
        },
    )
    emit(
        "user_turn_playing_status",
        {
            "username": username,
            "status": new_playing_status,
            "current_player": game.get_current_player(),
        },
        to=room_id,
    )


@socketio.on("surrend", namespace="/game")
def game_surrend():
    room_id = session["room_id"]
    username = session["username"]
    game = current_app.games.get(room_id)

    if game is None:
        emit("game_not_found", to=room_id)
        return

    # Validaiton
    is_visitor = username not in game.get_allowed_players()
    is_surrended = game.is_player_surrended(player=username)
    if is_visitor or is_surrended:
        return

    # Surrend Logic
    game.add_surrender(username)
    emit("self_surrend")
    emit(
        "user_surrend",
        {
            "surrenders": f"{game.get_number_of_surrenders()}/{game.get_max_surrenders()}",
        },
        to=room_id,
    )

    if game.get_number_of_surrenders() < game.get_max_surrenders() or game.is_ending():
        return

    # End Game Logic
    game.turn_on_ending()

    winner = game.get_player_with_max_score()
    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()
    
    cursor.execute('UPDATE rooms SET winner = %s WHERE id = %s', [winner, room_id])
    conn.commit()
    cursor.close()
    
    game.end_game(winner=winner)

    room = current_app.rooms.get(room_id)
    if room is not None:
        room.end_room(winner=winner)

    emit("game_end", {"winner": winner}, to=room_id)


@socketio.on("timeout", namespace="/game")
def game_timeout():
    room_id = session["room_id"]
    game = current_app.games.get(room_id)

    if game is None:
        emit("game_not_found", to=room_id)
        return

    if not game.is_timer_enabled():
        return

    timer = game.get_timer()

    if timer.can_reset():
        game.turn_current_player()
        timer.refresh()

    emit(
        "self_refresh_timer",
        f"{timer.get_target_timestamp()} {game.get_current_player()}",
    )
