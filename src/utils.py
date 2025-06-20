import random
import string
import math
from src.typings.game import Username
from typing import Callable


def generate_username():
    return f'User-{''.join([random.choice(string.ascii_letters) for _ in range(12)])}'


def get_min_max_index(index: int):
    row_i = math.floor(index / 15)
    max_i = ((row_i + 1) * 15) - 1
    min_i = row_i * 15

    return min_i, max_i


def cell_to_code(cell: str = " ", scored: bool = False) -> int:
    result = 0
    if cell == "S":
        result = 1
    elif cell == "O":
        result = 2

    return result if cell == " " else result + (scored * 2)


def cells_to_number_as_str(cells: list[str], states: list[str]) -> str:
    result = []
    for i, cell in enumerate(cells):
        result.append(str(cell_to_code(cell=cell, scored=states[i] == "1")))

    return "".join(result)


def get_min_max(array: list):
    max_v = float("-inf")
    min_v = float("inf")

    for v in array:
        if v > max_v:
            max_v = v
        if v < min_v:
            min_v = v

    return int(min_v), int(max_v)

def get_players_statuses_as_str(
    players: list[Username],
    fn_is_online: Callable[[Username], bool],
    fn_is_playing: Callable[[Username], bool],
):
    statuses = []
    for player in players:
        is_online = fn_is_online(player)
        is_playing = fn_is_playing(player)

        if is_online and is_playing:
            statuses.append("3")
        elif is_online and not is_playing:
            statuses.append("2")
        elif not is_online and is_playing:
            statuses.append("1")
        elif not is_online and not is_playing:
            statuses.append("1")
        else:
            statuses.append("")

    return "".join(statuses)
