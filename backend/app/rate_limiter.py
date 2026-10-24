import time
from typing import Dict, Tuple
from fastapi import HTTPException, status

# In-memory rate limiter for login attempts:
# Key: client_identifier (IP address or IP+username)
# Value: (attempt_count, lock_until_timestamp, first_attempt_timestamp)
_LOGIN_ATTEMPTS: Dict[str, Tuple[int, float, float]] = {}

MAX_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes
ATTEMPT_WINDOW_SECONDS = 900    # 15 minutes window

def check_login_rate_limit(client_ip: str, username: str) -> None:
    now = time.time()
    
    # Check by IP and by specific username target
    keys = [f"ip:{client_ip}", f"user:{username.lower().strip()}"]
    
    for key in keys:
        if key in _LOGIN_ATTEMPTS:
            count, lock_until, first_ts = _LOGIN_ATTEMPTS[key]
            
            # If locked out
            if now < lock_until:
                remaining_mins = int((lock_until - now) / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed login attempts. Account temporarily locked for {remaining_mins} minute(s)."
                )
            
            # Reset window if older than window
            if now - first_ts > ATTEMPT_WINDOW_SECONDS:
                _LOGIN_ATTEMPTS.pop(key, None)

def record_login_failure(client_ip: str, username: str) -> None:
    now = time.time()
    keys = [f"ip:{client_ip}", f"user:{username.lower().strip()}"]
    
    for key in keys:
        if key in _LOGIN_ATTEMPTS:
            count, lock_until, first_ts = _LOGIN_ATTEMPTS[key]
            if now - first_ts > ATTEMPT_WINDOW_SECONDS:
                _LOGIN_ATTEMPTS[key] = (1, 0, now)
            else:
                new_count = count + 1
                new_lock = now + LOCKOUT_DURATION_SECONDS if new_count >= MAX_ATTEMPTS else 0
                _LOGIN_ATTEMPTS[key] = (new_count, new_lock, first_ts)
        else:
            _LOGIN_ATTEMPTS[key] = (1, 0, now)

def record_login_success(client_ip: str, username: str) -> None:
    keys = [f"ip:{client_ip}", f"user:{username.lower().strip()}"]
    for key in keys:
        _LOGIN_ATTEMPTS.pop(key, None)

def reset_all_rate_limits() -> None:
    """Utility for testing teardown."""
    _LOGIN_ATTEMPTS.clear()
