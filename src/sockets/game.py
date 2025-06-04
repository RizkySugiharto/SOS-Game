from flask import session, current_app
from flask_socketio import emit, join_room, leave_room
from src.extensions import socketio, mysql
import src.utils as utils

PATTERN = 'SOS'
LIST_INDICES = (
    (-1, 0, 1), (-15, 0, 15), (-16, 0, 16), (-14, 0, 14),
    (-2, -1, 0), (2, 1, 0), (-30, -15, 0), (30, 15, 0), (-32, -16, 0), (32, 16, 0), (-28, -14, 0), (28, 14, 0),
)

@socketio.on('connect', namespace='/game')
def game_connect():    
    if not session.get('username', False):
        session['username'] = utils.generate_username()
    
    room_id = session['room_id']
    username = session['username']
    
    if not current_app.rooms_players.get(room_id, False):
        current_app.rooms_players[room_id] = []
    current_app.rooms_players[room_id].append(username)
    
    conn = mysql.connect()
    cursor = conn.cursor()
    
    scores = {}
    cursor.execute('SELECT username, score FROM scores WHERE room_id = %s', [room_id])
    for username, score in cursor.fetchall():
        scores[username] = score
        
    conn.close()
    
    if not current_app.rooms_surrenders.get(room_id, False):
        current_app.rooms_surrenders[room_id] = set()
        
    join_room(room=room_id)
    
    emit('user_init', {
        'players': current_app.rooms_players[room_id],
        'num_surrenders': len(current_app.rooms_surrenders[room_id]),
        'scores': scores
    })
    
    emit('user_join', {
        'username': username,
    }, to=room_id, include_self=False)
    
@socketio.on('disconnect', namespace='/game')
def game_disconnect():
    room_id = session['room_id']
    username = session['username']
    
    if len(current_app.rooms_players.get(room_id, [])) > 0:
        crrnt_player_i = current_app.rooms_players[room_id].index(username)
        current_app.rooms_crrnt_player[room_id] = current_app.rooms_players[room_id][(crrnt_player_i + 1) % len(current_app.rooms_players[room_id])]
        current_app.rooms_players[room_id].remove(username)
        
    leave_room(room=room_id)
        
    emit('user_leave', {
        'username': username,
        'current_player': current_app.rooms_crrnt_player[room_id] if current_app.rooms_crrnt_player.get(room_id, False) else '',
    }, to=room_id, include_self=False)
    
@socketio.on('play', namespace='/game')
def game_play(json: dict[str, object]):
    if session['username'] != current_app.rooms_crrnt_player[session['room_id']]:
        return
    
    crrnt_player_i = current_app.rooms_players[session['room_id']].index(session['username'])
    current_app.rooms_crrnt_player[session['room_id']] = current_app.rooms_players[session['room_id']][(crrnt_player_i + 1) % len(current_app.rooms_players[session['room_id']])]
    
    char_index: int = json.get('char_index', ' ')
    char: str = json.get('char', ' ')
    room_id = session.get('room_id', 0)
    
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute('SELECT cells, states FROM rooms WHERE id = %s', room_id)
    cells, states = cursor.fetchone()
    cells = list(cells)
    states = list(states)
    changed_states = []
    added_score = 0
    
    cells[char_index] = char
    for indices in LIST_INDICES:
        indices = list(map(lambda i: char_index + i, indices))
        selected_pattern = ''.join([cells[i] if i >= 0 and i < len(cells) else ' ' for i in indices])
        is_all_chars_active = all([states[i] == '1' for i in indices])
        
        if selected_pattern != PATTERN or is_all_chars_active:
            continue
        
        states[indices[0]] = '1'
        states[indices[1]] = '1'
        states[indices[2]] = '1'
        changed_states.extend(indices)
        added_score += 1
        
        cursor.execute('UPDATE scores SET score = score + 1 WHERE room_id = %s AND username = %s', [room_id, session['username']])
        
    cursor.execute('UPDATE rooms SET cells = %s, states = %s WHERE id = %s', [''.join(cells), ''.join(states), room_id])
    
    conn.commit()
    conn.close()
    
    emit('user_play', {
        'username': session['username'],
        'char_index': char_index,
        'char': char,
        'changed_states': changed_states,
        'added_score': added_score,
        'current_player': current_app.rooms_crrnt_player[session['room_id']],
    }, to=room_id)

@socketio.on('surrend', namespace='/game')
def game_surrend():
    room_id = session['room_id']
    username = session['username']
    
    if not current_app.rooms_surrenders.get(room_id, False):
        current_app.rooms_surrenders[room_id] = set()
        
    if username in current_app.rooms_surrenders[room_id]:
        current_app.rooms_surrenders[room_id].remove(username)
    else:
        current_app.rooms_surrenders[room_id].add(username)
        
    if len(current_app.rooms_surrenders[room_id]) < len(current_app.rooms_players[room_id]):
        emit('user_surrend', {
            'current': len(current_app.rooms_surrenders[room_id]),
            'max': len(current_app.rooms_players[room_id])
        }, broadcast=True)
        return
    
    conn = mysql.connect()
    cursor = conn.cursor()
    cursor.execute('SELECT username FROM scores WHERE room_id = %s AND score = (SELECT MAX(score) FROM scores WHERE room_id = %s)', [room_id, room_id])
    winner = cursor.fetchone()[0]
    
    cursor.execute('UPDATE rooms SET winner = %s WHERE id = %s', [winner, room_id])
    
    conn.commit()
    conn.close()
    
    emit('game_end', {
        'winner': winner
    }, to=room_id)