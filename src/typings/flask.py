from flask import Flask
from src.typings.game import RoomID, Username
from src.classes.room import Room
from src.classes.game import Game

class SOSFlask(Flask):
    rooms: dict[RoomID, Room] = {}
    games: dict[RoomID, Game] = {}
    currently_players_creating_room: set[Username] = set()