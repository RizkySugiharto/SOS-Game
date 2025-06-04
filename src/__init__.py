from flask import Flask, render_template
from src.extensions import mysql, toolbar, socketio
from src.routes import rooms, games

# Intialize Flask App
app = Flask(__name__)
app.config.from_pyfile('../config.py')
app.secret_key = '3344afd55440df9db59c3156694e8a30faf4e6a74d7c4c63e66f144dfebe1c7d'

# Initialize Extensions
mysql.init_app(app)
toolbar.init_app(app)
socketio.init_app(app)

# Initialize Globals Data
rooms_surrenders: dict[int, set[str]] = {}
rooms_players: dict[int, list[str]] = {}
rooms_crrnt_player: dict[int, str] = {}

app.rooms_surrenders = rooms_surrenders
app.rooms_players = rooms_players
app.rooms_crrnt_player = rooms_crrnt_player

# Register Blueprints
app.register_blueprint(rooms.bp)
app.register_blueprint(games.bp)

# Register Socket Handlers
import src.sockets.room
import src.sockets.game

# Register Index Pages
@app.get('/')
def index():
    return render_template('index.html')