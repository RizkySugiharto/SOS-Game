from flask import session, current_app
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio
import src.utils as utils
from src.typings import SOSFlask

current_app: SOSFlask

@socketio.on('connect', namespace='/room')
def room_connect():
    if not session.get('username', False):
        session['username'] = utils.generate_username()
    
    room_id = session['room_id']
    username = session['username']
    room = current_app.rooms.get(room_id)
    
    if room is None:
        emit("room_not_found")
        return
    
    is_added = room.add_player(username)
        
    emit('user_init', {
        'players': room.get_players(),
    })
    
    if not is_added:
        return
    
    join_room(room=room_id)
    emit('user_join', {
        'username': username,
    }, to=room_id, include_self=False)
    
@socketio.on('disconnect', namespace='/room')
def room_disconnect():
    room_id = session['room_id']
    username = session['username']
    room = current_app.rooms.get(room_id)
    
    if room is None:
        return
    
    is_removed = room.remove_player(username)
    if not is_removed:
        return
    
    leave_room(room=room_id)
    emit('user_leave', {
        'username': username,
    }, to=room_id, include_self=False)