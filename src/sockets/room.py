from flask import session, current_app
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio
import src.utils as utils

@socketio.on('connect', namespace='/room')
def room_connect():
    if not session.get('username', False):
        session['username'] = utils.generate_username()
    
    room_id = session['room_id']
    username = session['username']
    
    if not current_app.rooms_players.get(room_id, False):
        current_app.rooms_players[room_id] = []
    current_app.rooms_players[room_id].append(username)
    
    join_room(room=room_id)
    
    emit('user_init', {
        'players': current_app.rooms_players[room_id],
    })
    
    emit('user_join', {
        'username': username,
    }, to=room_id, include_self=False)
    
@socketio.on('disconnect', namespace='/room')
def room_disconnect():
    room_id = session['room_id']
    username = session['username']
    
    if len(current_app.rooms_players.get(room_id, [])) > 0:
        current_app.rooms_players[room_id].remove(username)
        
    leave_room(room=room_id)
        
    emit('user_leave', {
        'username': username,
    }, to=room_id, include_self=False)