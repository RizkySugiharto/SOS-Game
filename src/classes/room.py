from src.typings.game import Username
from src.classes.game import Game

class Room:
    __room_id: int
    __has_started: bool = False
    __players: list[Username] = []
    __host: Username = ''
    
    def __init__(self, room_id: int, host: Username = ''):
        self.__room_id= room_id
        self.__has_started = False
        self.__players = []
        self.__host= host
    
    def can_start_by(self, starter: Username):
        return not self.__has_started and len(self.__players) > 1 and starter == self.__host
    
    def start_room(self, starter: Username):
        if not self.can_start_by(starter):
            return
        
        game = Game(
            room_id=self.__room_id,
            host=self.__host,
            players=self.__players.copy()
        )
        
        return game
    
    def exec_after_start(self):
        self.__has_started = True
        self.__players = []
    
    def add_player(self, player: Username):
        if player in self.__players:
            return
        
        self.__players.append(player)
        
    def remove_player(self, player: Username):
        if player not in self.__players:
            return
        
        self.__players.remove(player)
        
    def get_room_id(self):
        return self.__room_id
    
    def get_players(self):
        return self.__players
    
    def get_host(self):
        return self.__host
    
    def set_host(self, host: Username):
        self.__host = host
    
    