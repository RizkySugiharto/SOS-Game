from src.typings.game import Username
from src.classes.game import Game
from typing import Optional


class Room:
    __room_id: int
    __has_started: bool
    __winner: Optional[Username]
    __players: list[Username]
    __sids: dict[Username, str]
    __host: Username

    def __init__(
        self,
        room_id: int,
        host: Username = "",
        has_started: bool = False,
        winner: Optional[Username] = None,
    ):
        self.__room_id = room_id
        self.__has_started = has_started
        self.__winner = winner
        self.__players = []
        self.__sids = {}
        self.__host = host

    def can_start_by(
        self,
        starter: Username,
    ):
        return (
            not self.__has_started
            and len(self.__players) > 1
            and starter == self.__host
        )

    def start_room(
        self,
        starter: Username,
        enable_timer: bool = False,
        timer_interval: int = 60,
        reset_timer_on_score: bool = False,
    ):
        if not self.can_start_by(starter):
            return

        scores = {player: 0 for player in self.__players}
        game = Game(
            room_id=self.__room_id,
            host=self.__host,
            allowed_players=set(self.__players),
            scores=scores,
            timer_enabled=enable_timer,
            timer_seconds=timer_interval,
            reset_timer_on_score=reset_timer_on_score,
        )

        return game

    def exec_after_start(self):
        self.__has_started = True
        self.__players = []

    def add_player(self, player: Username, sid: str):
        if player in self.__players:
            return False

        self.__players.append(player)
        self.__sids[player] = sid
        
        return True

    def remove_player(self, player: Username):
        if player not in self.__players:
            return False

        self.__players.remove(player)
        del self.__sids[player]
        
        return True

    def end_room(self, winner: Username):
        self.__winner = winner

    def has_started(self):
        return self.__has_started

    def has_ended(self):
        return self.__winner != None

    def get_room_id(self):
        return self.__room_id

    def get_winner(self):
        return self.__winner

    def get_players(self):
        return self.__players

    def get_host(self):
        return self.__host

    def set_host(self, host: Username):
        self.__host = host
        
    def get_sid(self, player: Username):
        return self.__sids.get(player)
