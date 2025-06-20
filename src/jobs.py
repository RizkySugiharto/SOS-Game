from timeloop import Timeloop
from datetime import timedelta
from src.typings import SOSFlask
from flask import current_app
from src.extensions import mysql
from pymysql.cursors import Cursor

current_app: SOSFlask
tl = Timeloop()

def register_jobs(app: SOSFlask):
    @tl.job(interval=timedelta(hours=6))
    def job_delete_unused_rooms():
        with app.test_request_context():
            current_app.logger.info(f"[ {job_delete_unused_rooms.__name__} ] job has been started")
            
            deleted_rooms = 0
            conn = mysql.get_db()
            cursor: Cursor = conn.cursor()
            
            cursor.execute('SELECT id FROM rooms WHERE winner IS NULL AND created_at < SUBDATE(NOW(), INTERVAL 24 HOUR)')
            
            for room_id, in cursor.fetchall():
                room = current_app.rooms.get(room_id)
                game = current_app.games.get(room_id)
                is_unused = room is None and game is None
                
                if room is not None and (not room.has_started() or game is None) and len(room.get_players()) < 1:
                    is_unused = True
                    current_app.rooms.pop(room_id)
                
                if game is not None and game.get_number_of_players() < 1:
                    is_unused = True
                    current_app.games.pop(room_id)
                    
                if is_unused:
                    deleted_rooms += 1
                    cursor.execute('DELETE FROM rooms WHERE id = %s', [room_id])
                
            conn.commit()
            cursor.close()
            
            current_app.logger.info(f"[ {job_delete_unused_rooms.__name__} ] job has ended. Number of deleted rooms: {deleted_rooms}")
