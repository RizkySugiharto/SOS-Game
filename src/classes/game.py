from src.typings.game import Username
from typing import Optional

class Game:
    __room_id: int
    __host: Username
    __winner: Optional[Username]
    __allowed_players: set[Username]
    __players: list[Username]
    __visitors: int
    __max_surrenders: int
    __scores: dict[Username, int]
    __surrenders: list[Username]
    __current_player: Username
    __cells: list[str]
    __states: list[str]
    __playing: bool
    __ending: bool
    
    def __init__(
        self,
        room_id: int,
        host: Username,
        players: Optional[list[Username]] = None,
        allowed_players: Optional[set[Username]] = None,
        scores: Optional[dict[Username, int]] = None,
        winner: Optional[Username] = None,
        cells: Optional[list[str]] = None,
        states: Optional[list[str]] = None,
    ):
        self.__room_id = room_id
        self.__host = host
        self.__winner = winner
        self.__allowed_players = allowed_players if isinstance(allowed_players, set) else set(allowed_players)
        self.__players = [] if players is None else players
        self.__visitors = 0
        self.__max_surrenders = len(self.__players)
        self.__scores = scores if scores is not None else {}
        self.__surrenders = []
        self.__current_player = self.__players[0] if len(self.__players) > 0 else ""
        self.__cells = cells if cells is not None else ( [' '] * (15 * 15) )
        self.__states = states if states is not None else ( ['0'] * (15 * 15) )
        self.__playing = False
        self.__ending = False

    def add_score(self, player: Username, score: int):
        if self.__scores.get(player, None) is None:
            self.__scores[player] = 0

        self.__scores[player] += score

    def add_player(self, player: Username):
        if player not in self.__allowed_players or player in self.__players:
            return False

        self.__players.append(player)
        self.__max_surrenders += 1

        if len(self.__players) <= 1:
            self.turn_current_player()
            
        return True

    def add_surrender(self, player: Username):
        if player not in self.__allowed_players or player in self.__surrenders:
            return False

        self.__surrenders.append(player)
        return True

    def remove_player(self, player: Username):
        if player not in self.__players:
            return False
        if player == self.__current_player:
            self.turn_current_player()

        self.__players.remove(player)
        self.__max_surrenders -= 1

        return True

    def turn_current_player(self):
        player_i = (
            -1
            if self.__current_player == ""
            else self.__players.index(self.__current_player)
        )
        self.__current_player = self.__players[(player_i + 1) % len(self.__players)]

    def end_game(self, winner: Username):
        self.__winner = winner

    def has_ended(self):
        return self.__winner is not None

    def get_room_id(self):
        return self.__room_id

    def get_host(self):
        return self.__host

    def get_winner(self):
        return self.__winner

    def get_current_player(self):
        return self.__current_player

    def get_players(self):
        return self.__players
    
    def get_visitors(self):
        return self.__visitors
    
    def get_allowed_players(self):
        return self.__allowed_players
    
    def get_joined_players(self):
        return list(set(self.__players).intersection(set(self.__allowed_players)))
    
    def get_allowed_players_as_list(self):
        return list(self.__allowed_players)

    def get_surrenders(self):
        return self.__surrenders

    def get_max_surrenders(self):
        return self.__max_surrenders

    def get_scores(self):
        return self.__scores
    
    def get_cells(self):
        return self.__cells
    
    def get_states(self):
        return self.__states
    
    def get_cells_as_str(self):
        return ''.join(self.__cells)
    
    def get_states_as_str(self):
        return ''.join(self.__states)
    
    def is_playing(self):
        return self.__playing
    
    def is_ending(self):
        return self.__ending
    
    def enable_playing(self):
        self.__playing = True
        
    def disable_playing(self):
        self.__playing = False
        
    def turn_on_ending(self):
        self.__ending = True
        
    def increase_visitors(self):
        self.__visitors += 1
        
    def decrease_visitors(self):
        if self.__visitors > 0:
            self.__visitors -= 1