from flask import session, current_app
from flask_socketio import emit, join_room, leave_room, disconnect
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
    room = current_app.rooms.get(room_id, None)
    
    if room is None:
        disconnect()
        return
    
    room.add_player(username)
    join_room(room=room_id)
    
    emit('user_init', {
        'players': room.get_players(),
    })
    
    emit('user_join', {
        'username': username,
    }, to=room_id, include_self=False)
    
@socketio.on('disconnect', namespace='/room')
def room_disconnect():
    room_id = session['room_id']
    username = session['username']
    room = current_app.rooms.get(room_id, None)
    
    if room is None:
        return
    
    room.remove_player(username)
    leave_room(room=room_id)
        
    emit('user_leave', {
        'username': username,
    }, to=room_id, include_self=False)