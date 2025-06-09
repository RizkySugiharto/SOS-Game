from flask import session, current_app
from flask_socketio import emit, join_room, leave_room, disconnect
from src.extensions import socketio, mysql
import src.utils as utils
from src.typings import SOSFlask

current_app: SOSFlask

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
    game = current_app.games.get(room_id, None)
    
    if game is None:
        disconnect()
        return
    
    conn = mysql.connect()
    cursor = conn.cursor()
    
    scores = {}
    cursor.execute('SELECT username, score FROM scores WHERE room_id = %s', [room_id])
    for username_score, score in cursor.fetchall():
        scores[username_score] = score
        
    conn.close()
        
    game.add_player(username)
    join_room(room=room_id)
    
    emit('user_init', {
        'current_player': game.get_current_player(),
        'players': game.get_players(),
        'num_surrenders': len(game.get_surrenders()),
        'scores': scores
    })
    
    emit('user_join', {
        'username': username,
    }, to=room_id, include_self=False)
    
@socketio.on('disconnect', namespace='/game')
def game_disconnect():
    room_id = session['room_id']
    username = session['username']
    game = current_app.games.get(room_id, None)
    
    if game is None:
        return
    
    game.remove_player(username)
    leave_room(room=room_id)
        
    emit('user_leave', {
        'username': username,
        'current_player': game.get_current_player(),
    }, to=room_id, include_self=False)
    
@socketio.on('play', namespace='/game')
def game_play(json: dict[str, object]):
    room_id = session.get('room_id', 0)
    game = current_app.games.get(room_id)
    
    if game is None:
        return
    if session['username'] != game.get_current_player():
        return
    
    game.turn_current_player()
    
    char_index: int = json.get('char_index', ' ')
    char: str = json.get('char', ' ')
    
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
        'current_player': game.get_current_player(),
    }, to=room_id)

@socketio.on('surrend', namespace='/game')
def game_surrend():
    room_id = session['room_id']
    username = session['username']
    game = current_app.games.get(room_id)
    
    if game is None:
        return
    
    game.add_surrender(username)
    
    emit('user_surrend', {
        'current': len(game.get_surrenders()),
        'max': game.get_max_surrenders()
    }, broadcast=True)
        
    if len(game.get_surrenders()) < game.get_max_surrenders():
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