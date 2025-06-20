from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    session,
    current_app,
)
from src.extensions import mysql
import src.utils as utils
from src.typings import SOSFlask
from src.classes.game import Game
from pymysql.cursors import Cursor

current_app: SOSFlask

bp = Blueprint("games", __name__)


@bp.get("/games/<int:room_id>")
def view_game(room_id):
    session["room_id"] = room_id
    if not session.get("username", False):
        session["username"] = utils.generate_username()

    username = session["username"]
    conn = mysql.get_db()
    cursor: Cursor = conn.cursor()
    game = current_app.games.get(room_id)

    if game is None:
        cursor.execute(
            "SELECT winner, host, started, cells, states, timer_interval, reset_timer_on_score FROM rooms WHERE id = %s",
            [room_id],
        )
        if cursor.rowcount < 1:
            cursor.close()
            flash(f"Error: Room with id {room_id} isn't exists :(", category="danger")
            return redirect(url_for("join_room"))

        winner, host, started, cells, states, timer_interval, reset_timer_on_score = cursor.fetchone()

        if not started:
            cursor.close()
            flash(
                f"Error: Room with id {room_id} hasn't even started yet :/",
                category="danger",
            )
            return redirect(url_for("join_room"))

        if winner:
            cursor.close()
            return redirect(url_for("games.thank_you"))

        scores = {}
        players = []
        cursor.execute(
            "SELECT username, score FROM scores WHERE room_id = %s", [room_id]
        )
        for username_score, score in cursor.fetchall():
            players.append(username_score)
            scores[username_score] = score

        game = Game(
            room_id=room_id,
            host=host,
            allowed_players=set(players),
            scores=scores,
            winner=winner,
            cells=list(cells),
            states=list(states),
            timer_enabled=(timer_interval is not None),
            timer_seconds=timer_interval,
            reset_timer_on_score=reset_timer_on_score
        )
        current_app.games[room_id] = game

    cursor.close()

    return render_template(
        "game.html",
        room_id=room_id,
        host=game.get_host(),
        current_player=game.get_current_player(),
        is_visitor=(username not in game.get_allowed_players()),
        is_timer_enabled=game.is_timer_enabled(),
    )


@bp.get("/games/thank-you")
def thank_you():
    room_id = session.get("room_id", 0)
    if not room_id:
        return redirect(url_for("index"))

    game = current_app.games.get(room_id)
    if game is None:
        cursor: Cursor = mysql.get_db().cursor()

        cursor.execute("SELECT winner FROM rooms WHERE id = %s", [room_id])
        winner = cursor.fetchone()[0]

        cursor.close()

        if not winner:
            return redirect(url_for("games.view_game", room_id=room_id))

        return render_template("thank_you.html", winner=winner)

    if not game.has_ended():
        return redirect(url_for("games.view_game", room_id=room_id))

    return render_template("thank_you.html", winner=game.get_winner())
