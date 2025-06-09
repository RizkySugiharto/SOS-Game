from flask import Flask
from src.typings.game import RoomID
from src.classes.room import Room
from src.classes.game import Game

class SOSFlask(Flask):
    rooms: dict[RoomID, Room] = {}
    games: dict[RoomID, Game] = {}