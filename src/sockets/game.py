from flask import session, current_app
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio, mysql
import src.utils as utils
from src.typings import SOSFlask
from pymysql.cursors import Cursor
from typing import Optional

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

    is_visitor = username not in game.get_allowed_players()
    is_added = game.add_player(username)

    emit(
        "user_init",
        {
            "current_player": game.get_current_player(),
            "players": game.get_allowed_players_as_list(),
            "joined_players": game.get_joined_players(),
            "visitors": game.get_visitors(),
            "num_surrenders": len(game.get_surrenders()),
            "scores": game.get_scores(),
        },
    )
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

    is_visitor = username not in game.get_allowed_players()
    is_removed = game.remove_player(username)

    leave_room(room=room_id)

    if is_visitor:
        game.decrease_visitors()
        emit(
            "visitor_leave",
            {
                "visitors": game.get_visitors(),
            },
            to=room_id,
        )

    if not is_removed:
        return

    emit(
        "user_leave",
        {
            "username": username,
            "current_player": game.get_current_player(),
        },
        to=room_id,
        include_self=False,
    )


@socketio.on("play", namespace="/game")
def game_play(json: dict[str, object]):
    room_id: Optional[int] = session.get("room_id", 0)
    game = current_app.games.get(room_id)
    username: Optional[str] = session.get("username")
    is_visitor = username not in game.get_allowed_players()

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
        return

    game.enable_playing()

    char_index: Optional[int] = json.get("char_index")
    char: Optional[str] = json.get("char")
    cells = game.get_cells()
    states = game.get_states()
    changed_states = []
    added_score = 0

    if char_index is None or char is None:
        return

    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()

    cells[char_index] = char
    for indices in LIST_INDICES:
        indices = list(map(lambda i: char_index + i, indices))
        selected_pattern = "".join(
            [cells[i] if i >= 0 and i < len(cells) else " " for i in indices]
        )
        is_all_chars_active = all([states[i] == "1" for i in indices])

        if selected_pattern != PATTERN or is_all_chars_active:
            continue

        states[indices[0]] = "1"
        states[indices[1]] = "1"
        states[indices[2]] = "1"
        changed_states.extend(indices)
        added_score += 1

    game.get_scores()[username] += added_score
    if added_score < 1:
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


@socketio.on("surrend", namespace="/game")
def game_surrend():
    room_id = session["room_id"]
    username = session["username"]
    game = current_app.games.get(room_id)

    if game is None:
        emit("game_not_found", to=room_id)
        return

    is_visitor = username not in game.get_allowed_players()
    if is_visitor:
        return

    game.add_surrender(username)
    emit(
        "user_surrend",
        {
            "current": len(game.get_surrenders()),
            "max": game.get_max_surrenders(),
        },
        broadcast=True,
    )

    if len(game.get_surrenders()) < game.get_max_surrenders() or game.is_ending():
        return

    game.turn_on_ending()

    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()

    cursor.execute(
        "SELECT username FROM scores WHERE room_id = %s AND score = (SELECT MAX(score) FROM scores WHERE room_id = %s)",
        [room_id, room_id],
    )
    winner = cursor.fetchone()[0]

    cursor.execute("UPDATE rooms SET winner = %s WHERE id = %s", [winner, room_id])
    conn.commit()

    cursor.close()

    game.end_game(winner=winner)
    room = current_app.rooms.get(room_id)
    if room is not None:
        room.end_room(winner=winner)

    emit("game_end", {"winner": winner}, to=room_id)
