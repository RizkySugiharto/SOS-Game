import random
import string

def generate_username():
    return f'User-{''.join([random.choice(string.ascii_letters) for _ in range(12)])}'