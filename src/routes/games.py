from flask import Blueprint, render_template, redirect, url_for, flash, session, current_app
from src.extensions import mysql
import src.utils as utils
from src.typings import SOSFlask
from src.classes.game import Game

current_app: SOSFlask

bp = Blueprint('games', __name__)

@bp.get('/games/<int:room_id>')
def view_game(room_id):
    conn = mysql.connect()
    cursor = conn.cursor()
    
    cursor.execute('SELECT winner, host, started, cells, states FROM rooms WHERE id = %s', [room_id])
    if cursor.rowcount < 1:
        flash(f"Error: Room with id {room_id} isn't exists :(", category='danger')
        return redirect(url_for('join_room'))
        
    winner, host, started, cells, states = cursor.fetchone()
    
    if winner:
        conn.close()
        
        flash(f'The game has been finished by {winner}', category='info')
        return redirect(url_for('join_room'))
    
    session['room_id'] = room_id
    
    scores = {}
    players = []
    cursor.execute('SELECT username, score FROM scores WHERE room_id = %s', [room_id])
    for username_score, score in cursor.fetchall():
        players.append(username_score)
        scores[username_score] = score
    
    conn.close()
    
    if not session.get('username', False):
        session['username'] = utils.generate_username()
    
    if not started:
        flash(f"Error: Room with id {room_id} hasn't even started yet :/", category='danger')
        return redirect(url_for('join_room'))
    
    game = current_app.games.get(room_id)
    if game is None:
        game = Game(
            room_id=room_id,
            host=host,
            players=players,
            scores=scores
        )
        current_app.games[room_id] = game
    
    return render_template(
        'game.html',
        room_id=room_id,
        host=host,
        cells=cells,
        states=states,
        current_player=game.get_current_player(),
    )
    
@bp.get('/games/thank-you')
def thank_you():
    room_id = session.get('room_id', 0)
    if not room_id:
        return redirect(url_for('index'))
    
    conn = mysql.connect()
    cursor = conn.cursor()
    
    cursor.execute('SELECT winner FROM rooms WHERE id = %s', [room_id])
    winner = cursor.fetchone()[0]
    
    return render_template('thank_you.html', winner=winner)
