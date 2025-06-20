from src.typings.game import Username
from src.classes.timer import Timer
from typing import Optional


class Game:
    __room_id: int
    __host: Username
    __winner: Optional[Username]
    __allowed_players: set[Username]
    __online_statuses: dict[Username, bool]
    __surrend_statuses: dict[Username, bool]
    __playing_statuses: dict[Username, bool]
    __visitors: int
    __current_surrenders: int
    __max_surrenders: int
    __scores: dict[Username, int]
    __current_player: Username
    __current_player_i: int
    __cells: list[str]
    __states: list[str]
    __filled_cells: int
    __playing: bool
    __ending: bool
    __timer: Optional[Timer]
    __reset_timer_on_score: bool

    def __init__(
        self,
        room_id: int,
        host: Username,
        allowed_players: Optional[set[Username]] = None,
        scores: Optional[dict[Username, int]] = None,
        winner: Optional[Username] = None,
        cells: Optional[list[str]] = None,
        states: Optional[list[str]] = None,
        timer_enabled: bool = False,
        timer_seconds: int = 10,
        reset_timer_on_score: bool = False,
    ):
        self.__room_id = room_id
        self.__host = host
        self.__winner = winner
        self.__allowed_players = (
            allowed_players
            if isinstance(allowed_players, set)
            else set(allowed_players)
        )
        self.__online_statuses = {}
        self.__surrend_statuses = {}
        self.__playing_statuses = {}
        self.__visitors = 0
        self.__current_surrenders = 0
        self.__max_surrenders = 0
        self.__scores = scores if scores is not None else {}
        self.__current_player = ""
        self.__current_player_i = 0
        self.__cells = cells if cells is not None else ([" "] * (15 * 15))
        self.__states = states if states is not None else (["0"] * (15 * 15))
        self.__filled_cells = 0
        self.__playing = False
        self.__ending = False
        self.__timer = (
            Timer(seconds=timer_seconds)
            if timer_enabled and timer_seconds > 0
            else None
        )
        self.__reset_timer_on_score = reset_timer_on_score

        for allowed_player in list(allowed_players):
            self.__online_statuses[allowed_player] = False
            self.__surrend_statuses[allowed_player] = False
            self.__playing_statuses[allowed_player] = True

        if cells is not None:
            for cell in cells:
                if cell in {"S", "O"}:
                    self.__filled_cells += 1

    def __refresh_current_surrenders(self):
        current = 0
        for username, is_surrend in self.__surrend_statuses.items():
            if self.__online_statuses[username] and is_surrend:
                current += 1

        self.__current_surrenders = current

    def add_score(self, player: Username, score: int):
        if self.__scores.get(player, None) is None:
            self.__scores[player] = 0

        self.__scores[player] += score

    def add_player(self, player: Username):
        if player not in self.__allowed_players or self.__online_statuses[player]:
            return False

        self.__online_statuses[player] = True
        self.__max_surrenders += 1
        self.__refresh_current_surrenders()

        if self.get_number_of_players() == 1:
            self.turn_current_player()

        return True

    def add_surrender(self, player: Username):
        if player not in self.__allowed_players or self.__surrend_statuses[player]:
            return False

        self.__surrend_statuses[player] = True
        self.__refresh_current_surrenders()

        return True

    def remove_player(self, player: Username):
        if not self.__online_statuses.get(player, False):
            return False
        if player == self.__current_player:
            self.turn_current_player()

        self.__online_statuses[player] = False
        self.__max_surrenders -= 1
        self.__refresh_current_surrenders()

        return True

    def turn_current_player(self):
        allowed_players = self.get_allowed_players_as_list()

        while True:
            self.__current_player_i = (self.__current_player_i + 1) % len(
                allowed_players
            )
            player = allowed_players[self.__current_player_i]
            if self.__online_statuses[player] and self.__playing_statuses[player]:
                break

        self.__current_player = allowed_players[self.__current_player_i]

    def turn_playing_status(self, player: Username):
        if not self.__surrend_statuses.get(player, False):
            return self.__playing_statuses.get(player, True)

        current_playing_status = not self.__playing_statuses.get(player, True)
        self.__playing_statuses[player] = current_playing_status

        if not current_playing_status:
            self.turn_current_player()

        return current_playing_status

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

    def get_number_of_players(self):
        number_of_players = 0
        for is_online in self.__online_statuses.values():
            if is_online:
                number_of_players += 1

        return number_of_players

    def get_number_of_active_players(self):
        number_of_active_players = 0
        for is_online, is_playing in zip(
            self.__online_statuses.values(),
            self.__playing_statuses.values(),
            strict=True,
        ):
            if is_online and is_playing:
                number_of_active_players += 1

        return number_of_active_players

    def get_visitors(self):
        return self.__visitors

    def get_allowed_players(self):
        return self.__allowed_players

    def get_allowed_players_as_list(self):
        return list(self.__allowed_players)

    def get_number_of_surrenders(self):
        return self.__current_surrenders

    def get_max_surrenders(self):
        return self.__max_surrenders

    def get_scores_as_str(self):
        return " ".join([str(s) for s in self.__scores.values()])

    def get_cells(self):
        return self.__cells

    def get_states(self):
        return self.__states

    def get_cells_as_str(self):
        return "".join(self.__cells)

    def get_states_as_str(self):
        return "".join(self.__states)

    def get_player_with_max_score(self):
        players = self.get_allowed_players_as_list()
        max_score = float("-inf")
        result = players[0]

        for player in players:
            score = self.__scores.get(player, 0)
            if score > max_score:
                max_score = score
                result = player

        return result

    def get_timer(self):
        return self.__timer

    def is_playing(self):
        return self.__playing

    def is_ending(self):
        return self.__ending

    def is_player_surrended(self, player: Username):
        return self.__surrend_statuses.get(player, False)

    def is_player_online(self, player: Username):
        return self.__online_statuses.get(player, False)

    def is_player_playing(self, player: Username):
        return self.__playing_statuses.get(player, False)

    def is_timer_enabled(self):
        return self.__timer is not None

    def is_all_filled(self):
        return self.__filled_cells >= len(self.__cells)

    def is_reset_timer_when_scored(self):
        return self.__reset_timer_on_score

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

    def increment_filled_cells(self):
        self.__filled_cells += 1
