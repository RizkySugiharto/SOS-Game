from flask import Flask, render_template
from src.typings import SOSFlask
from src.extensions import mysql, toolbar, socketio
from src.routes import rooms, games
from dotenv import load_dotenv
import os
import json

# Load .env file
load_dotenv(dotenv_path='../.env')

# Intialize Flask App
app = SOSFlask(__name__)
app.config.from_pyfile('./config.py')
app.secret_key = os.getenv('SECRET_KEY')

# Initialize Extensions
mysql.init_app(app)
toolbar.init_app(app)
socketio.init_app(app)

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