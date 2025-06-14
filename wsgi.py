from src import app
from gevent.pywsgi import WSGIServer
import os

if __name__ == '__main__':
    http_server = WSGIServer(('0.0.0.0', os.getenv('FLASK_RUN_PORT')), app)
    http_server.serve_forever()