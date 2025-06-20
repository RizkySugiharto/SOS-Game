from datetime import datetime, timedelta, timezone
import math

class Timer:
    __target_dt: datetime
    __interval: timedelta

    def __init__(self, seconds: int = 0):
        self.__interval = timedelta(seconds=seconds)
        self.__target_dt = datetime.now(timezone.utc) + self.__interval
        
    def get_target_timestamp(self):
        return self.__target_dt.timestamp()
    
    def can_reset(self):
        now = datetime.now(timezone.utc)
        return now >= self.__target_dt
    
    def refresh(self):
        delta = datetime.now(timezone.utc) - self.__target_dt
        if delta.seconds < 0:
            delta = 0
            
        multiplier = math.ceil(delta / self.__interval)
        self.__target_dt += self.__interval * multiplier
        
    def reset(self):
        self.__target_dt = datetime.now(timezone.utc) + self.__interval
