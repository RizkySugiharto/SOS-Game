# Patch sockets to make everything asynchronous
from gevent import monkey
monkey.patch_all()

from flask import render_template
from src.typings import SOSFlask
from src.extensions import mysql, toolbar, socketio
from src.routes import rooms, games
from dotenv import load_dotenv
from src.jobs import tl, register_jobs
import os

# Load .env file
load_dotenv(
    dotenv_path='../.env',
    verbose=True,
    override=True
)

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

# Start the cron jobs / time loop
register_jobs(app=app)
tl.start(block=False)