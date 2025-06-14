from flaskext.mysql import MySQL
from flask_debugtoolbar import DebugToolbarExtension
from flask_socketio import SocketIO
import pymysql
from pymysql.cursors import Cursor

pymysql.install_as_MySQLdb()

toolbar = DebugToolbarExtension()
mysql = MySQL(
    autocommit=False,
    cursorclass=Cursor,
)
socketio = SocketIO()
