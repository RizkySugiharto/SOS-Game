from flask import session, current_app, request
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio, mysql
import src.utils as utils
from src.typings import SOSFlask
from pymysql.cursors import Cursor

current_app: SOSFlask


@socketio.on("connect", namespace="/room")
def room_connect():
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    room_id = session["room_id"]
    username = session["username"]
    room = current_app.rooms.get(room_id)

    if room is None:
        emit("room_not_found")
        return

    is_added = room.add_player(player=username, sid=request.sid)

    emit(
        "self_init",
        {
            "players": room.get_players(),
        },
    )

    if not is_added:
        return

    join_room(room=room_id)
    emit("user_join", username, to=room_id, include_self=False)


@socketio.on("disconnect", namespace="/room")
def room_disconnect():
    room_id = session["room_id"]
    username = session["username"]
    room = current_app.rooms.get(room_id)

    if room is None:
        return

    is_removed = room.remove_player(username)
    if not is_removed:
        return

    leave_room(room=room_id)
    emit("user_leave", username, to=room_id, include_self=False)


@socketio.on("kick_user", namespace="/room")
def room_kick_user(selected_username: str):
    room_id = session["room_id"]
    username = session["username"]
    room = current_app.rooms.get(room_id)

    if room is None:
        return
    if username != room.get_host():
        return

    selected_sid = room.get_sid(player=selected_username)
    is_removed = room.remove_player(selected_username)
    if not is_removed or selected_sid is None:
        return

    emit("user_kicked", selected_username, to=room_id)
    emit("self_kicked", to=selected_sid)


@socketio.on("disband", namespace="/room")
def room_disband():
    room_id = session["room_id"]
    username = session["username"]
    room = current_app.rooms.get(room_id)

    if room is None:
        return
    if username != room.get_host():
        return

    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()

    cursor.execute("DELETE FROM rooms WHERE id = %s", [room_id])

    conn.commit()
    cursor.close()

    del current_app.rooms[room_id]

    emit("room_disbanded", to=room_id)
