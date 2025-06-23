from flaskext.mysql import MySQL
from flask_debugtoolbar import DebugToolbarExtension
from flask_socketio import SocketIO
from flask_minify import Minify
from flask_seasurf import SeaSurf
from flask_compress import Compress
import pymysql
from pymysql.cursors import Cursor

pymysql.install_as_MySQLdb()

toolbar = DebugToolbarExtension()
mysql = MySQL(
    autocommit=False,
    cursorclass=Cursor,
)
socketio = SocketIO()
minify = Minify(html=True, js=True, cssless=True)
csrf = SeaSurf()
compress = Compress()