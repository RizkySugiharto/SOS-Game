from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    session,
    current_app,
    request,
)
from flask_socketio import emit
from src.classes.room import Room
from src.extensions import mysql
import src.utils as utils
from src.typings import SOSFlask
from pymysql.cursors import Cursor

current_app: SOSFlask
bp = Blueprint("rooms", __name__)


@bp.get("/rooms/<int:room_id>")
def view_room(room_id):
    session["room_id"] = room_id
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    cursor: Cursor = mysql.get_db().cursor()
    room = current_app.rooms.get(room_id)

    if room is None:
        cursor.execute(
            "SELECT winner, host, started FROM rooms WHERE id = %s", [room_id]
        )
        if cursor.rowcount < 1:
            cursor.close()
            flash(f"Error: Room with id {room_id} isn't exists :(", category="danger")
            return redirect(url_for("rooms.join_room"))

        winner, host, started = cursor.fetchone()

        room = Room(room_id=room_id, host=host, has_started=started, winner=winner)
        current_app.rooms[room_id] = room

    cursor.close()

    if room.has_ended():
        return redirect(url_for("games.thank_you"))

    if room.has_started():
        return redirect(url_for("games.view_game", room_id=room_id))

    return render_template(
        "room.html",
        room_id=room_id,
        host=room.get_host(),
    )

@bp.post("/rooms/create")
def create_room():
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    username = session["username"]
    if username in current_app.currently_players_creating_room:
        return redirect(url_for("index"))

    current_app.currently_players_creating_room.add(username)
    conn = mysql.get_db()
    conn.begin()

    cursor: Cursor = conn.cursor()
    cursor.execute("INSERT INTO rooms (host) VALUES (%s)", [username])
    cursor.execute("SELECT LAST_INSERT_ID()")
    room_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()

    current_app.rooms[room_id] = Room(room_id=room_id, host=username)
    session["room_id"] = room_id
    current_app.currently_players_creating_room.remove(username)

    return redirect(url_for("rooms.view_room", room_id=room_id))


@bp.get("/rooms/join")
def join_room():
    return render_template("join.html")


@bp.post("/rooms/<int:room_id>/start")
def start_room(room_id):
    emit("game_start", {"started": False}, namespace="/room", to=room_id)

    session["room_id"] = room_id
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    username = session["username"]
    room = current_app.rooms.get(room_id)
    if room is None:
        cursor: Cursor = mysql.get_db().cursor()

        cursor.execute(
            "SELECT winner, host, started FROM rooms WHERE id = %s", [room_id]
        )
        winner, host, started = cursor.fetchone()
        cursor.close()

        room = Room(room_id=room_id, host=host, has_started=started, winner=winner)
        current_app.rooms[room_id] = room

    if room.has_ended():
        return redirect(url_for("games.thank_you"))

    if room.has_started():
        return redirect(url_for("games.view_game", room_id=room_id))

    if username != room.get_host():
        flash("You aren't the host", category="danger")
        return redirect(url_for("rooms.view_room", room_id=room_id))

    if len(room.get_players()) < 2:
        flash("There must be at least 2 players in the room", category="danger")
        return redirect(url_for("rooms.view_room", room_id=room_id))

    timer_enabled = request.form.get("timer_enabled") == "true"
    timer_duration = request.form.get("timer_duration")
    reset_timer_on_score = request.form.get("reset_timer_on_score") == "true"

    timer_duration = (
        int(timer_duration)
        if timer_duration is not None and timer_duration.isdigit()
        else None
    )
    is_timer_enabled = timer_enabled and timer_duration is not None
    game = (
        room.start_room(
            starter=username,
            enable_timer=True,
            timer_interval=timer_duration,
            reset_timer_on_score=reset_timer_on_score,
        )
        if is_timer_enabled
        else room.start_room(starter=username)
    )

    if game is None:
        flash("Failed to start the game", category="danger")
        return redirect(url_for("rooms.view_room", room_id=room_id))

    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()

    cursor.execute("UPDATE rooms SET started = 1 WHERE id = %s", [room_id])
    if is_timer_enabled:
        cursor.execute(
            "UPDATE rooms SET timer_interval = %s, reset_timer_on_score = %s WHERE id = %s",
            [timer_duration, reset_timer_on_score, room_id],
        )

    for player in room.get_players():
        cursor.execute(
            "INSERT INTO scores (room_id, username) VALUES (%s, %s)", [room_id, player]
        )

    conn.commit()
    cursor.close()

    room.exec_after_start()
    current_app.games[room_id] = game

    emit("game_start", {"started": True}, namespace="/room", to=room_id)

    return redirect(url_for("games.view_game", room_id=room_id))
