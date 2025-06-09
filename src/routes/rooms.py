from flask import Blueprint, render_template, redirect, url_for, flash, session, request, current_app
from flask_socketio import emit
from src.classes.room import Room
from src.extensions import mysql
import src.utils as utils
from src.typings import SOSFlask
import json

current_app: SOSFlask
bp = Blueprint('rooms', __name__)

@bp.get('/rooms/<int:room_id>')
def view_room(room_id):
    conn = mysql.connect()
    cursor = conn.cursor()
    
    cursor.execute('SELECT winner, host, started FROM rooms WHERE id = %s', [room_id])
    if cursor.rowcount < 1:
        flash(f"Error: Room with id {room_id} isn't exists :(", category='danger')
        return redirect(url_for('rooms.join_room'))
        
    winner, host, started = cursor.fetchone()
    
    conn.close()
    
    if winner:
        flash(f'The game has been finished by {winner}', category='info')
        return redirect(url_for('rooms.join_room'))
        
    session['room_id'] = room_id
    
    if not session.get('username', False):
        session['username'] = utils.generate_username()
        
    if started:
        return redirect(url_for('games.view_game', room_id=room_id))
    
    room = current_app.rooms.get(room_id)
    if room is None:
        room = Room(room_id=room_id, host=host)
        current_app.rooms[room_id] = room
    
    return render_template(
        'room.html',
        room_id=room_id,
        host=host,
    )
    
@bp.post('/rooms/create')
def create_room():
    if not session.get('username', False):
        session['username'] = utils.generate_username()
    
    conn = mysql.connect()
    conn.begin()
    
    cursor = conn.cursor()
    cursor.execute('INSERT INTO rooms (host) VALUES (%s)', [session['username']])
    cursor.execute('SELECT LAST_INSERT_ID()')
    room_id = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    current_app.rooms[room_id] = Room(room_id=room_id, host=session['username'])
    
    return redirect(url_for('rooms.view_room', room_id=room_id))

@bp.get('/rooms/join')
def join_room():
    return render_template('join.html')

@bp.post('/rooms/<int:room_id>/start')
def start_room(room_id):
    if not session.get('username', False):
        session['username'] = utils.generate_username()
        
    conn = mysql.connect()
    cursor = conn.cursor()
    
    cursor.execute('SELECT host FROM rooms WHERE id = %s', [room_id])
    host = cursor.fetchone()[0]
    room = current_app.rooms.get(room_id)
    if room is None:
        room = Room(room_id=room_id, host=host)
        current_app.rooms[room_id] = room
        
    if session['username'] != host:
        conn.close()
        flash("You aren't the host", category='danger')
        return redirect(url_for('rooms.view_room', room_id=room_id))
    
    game = room.start_room(starter=session['username'])
    if len(room.get_players()) < 2:
        conn.close()
        flash("There must be at least 2 players in the room", category='danger')
        return redirect(url_for('rooms.view_room', room_id=room_id))
    elif game is None:
        conn.close()
        flash("Failed to start the game", category='danger')
        return redirect(url_for('rooms.view_room', room_id=room_id))
    
    cursor.execute('UPDATE rooms SET started = 1 WHERE id = %s', [room_id])
    for player in room.get_players():
        cursor.execute('INSERT INTO scores (room_id, username) VALUES (%s, %s)', [room_id, player])
    
    conn.commit()
    conn.close()
    
    room.exec_after_start()
    current_app.games[room_id] = game
    
    emit('game_start', namespace='/room', broadcast=True)
    
    return redirect(url_for('games.view_game', room_id=room_id))
