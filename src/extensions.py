from flaskext.mysql import MySQL
from flask_debugtoolbar import DebugToolbarExtension
from flask_socketio import SocketIO
import pymysql

pymysql.install_as_MySQLdb()

toolbar = DebugToolbarExtension()
mysql = MySQL()
socketio = SocketIO()
