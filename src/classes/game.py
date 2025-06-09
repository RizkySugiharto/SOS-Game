from src.typings.game import Username

class Game:
    __room_id: int
    __host: Username
    __players: list[Username] = []
    __allowed_players: set[Username] = set()
    __max_surrenders: int = 0
    __scores: dict[Username, int] = {}
    __surrenders: list[Username] = []
    __current_player: Username = ''
    
    def __init__(self, room_id: int, host: Username, players: list[Username], scores: dict[Username, int] = {}):
        self.__room_id= room_id
        self.__host = host
        self.__allowed_players = set(players)
        self.__players = players
        self.__scores = scores
        self.__max_surrenders = len(players)
        
        self.turn_current_player()
    
    def has_ended(self, player: Username):
        return len(self.__surrenders)>= self.__max_surrenders
    
    def add_score(self, player: Username, score: int):
        if self.__scores.get(player, None) is None:
            self.__scores[player] = 0
        
        self.__scores[player] += score
        
    def add_player(self, player: Username):
        if player not in self.__allowed_players or player in self.__players:
            return
        
        self.__players.append(player)
        self.__max_surrenders += 1
        
    def add_surrender(self, player: Username):
        if player not in self.__allowed_players or player in self.__surrenders:
            return
        
        self.__surrenders.append(player)
        
    def remove_player(self, player: Username):
        if player not in self.__players:
            return
        if player == self.__current_player:
            self.turn_current_player()
            
        self.__players.remove(player)
        self.__max_surrenders -= 1
        
    def turn_current_player(self):
        player_i = 0 if self.__current_player == '' else self.__players.index(self.__current_player)
        self.__current_player = self.__players[(player_i + 1) % len(self.__players)]
        
    def get_room_id(self):
        return self.__room_id
    
    def get_host(self):
        return self.__host
    
    def get_current_player(self):
        return self.__current_player
    
    def get_players(self):
        return self.__players
    
    def get_surrenders(self):
        return self.__surrenders
    
    def get_max_surrenders(self):
        return self.__max_surrenders
    
    def get_scores(self):
        return self.__scores
    
    
    