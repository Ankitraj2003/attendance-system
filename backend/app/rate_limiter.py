import time
import threading
from typing import Dict, Tuple, Optional
from fastapi import HTTPException, status
import logging

from app.config import settings

logger = logging.getLogger("rate_limiter")

MAX_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes
ATTEMPT_WINDOW_SECONDS = 900    # 15 minutes window

# In-memory fallback rate limiter
_LOGIN_ATTEMPTS: Dict[str, Tuple[int, float, float]] = {}
_LOCK = threading.Lock()

# Redis client initialization (optional shared limiter)
_redis_client = None
_redis_initialized = False

def get_redis_client():
    global _redis_client, _redis_initialized
    if not _redis_initialized:
        _redis_initialized = True
        redis_url = settings.REDIS_URL
        if redis_url:
            try:
                import redis
                client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
                client.ping()
                _redis_client = client
                logger.info("Shared Redis rate limiter connected successfully.")
            except Exception as e:
                logger.warning("Failed to connect to Redis; falling back to in-memory rate limiter: %s", e)
                _redis_client = None
    return _redis_client

def check_login_rate_limit(client_ip: str, username: str) -> None:
    now = time.time()
    clean_user = username.lower().strip()
    keys = [f"ratelimit:ip:{client_ip}", f"ratelimit:user:{clean_user}"]

    r = get_redis_client()
    if r:
        try:
            for key in keys:
                lock_key = f"{key}:lockout"
                ttl = r.ttl(lock_key)
                if ttl and ttl > 0:
                    remaining_mins = int(ttl / 60) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many failed login attempts. Account temporarily locked for {remaining_mins} minute(s)."
                    )
            return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Redis check failed; falling back to memory: %s", e)

    # In-memory fallback
    with _LOCK:
        for key in keys:
            if key in _LOGIN_ATTEMPTS:
                count, lock_until, first_ts = _LOGIN_ATTEMPTS[key]
                if now < lock_until:
                    remaining_mins = int((lock_until - now) / 60) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many failed login attempts. Account temporarily locked for {remaining_mins} minute(s)."
                    )
                if now - first_ts > ATTEMPT_WINDOW_SECONDS:
                    _LOGIN_ATTEMPTS.pop(key, None)

def record_login_failure(client_ip: str, username: str) -> None:
    now = time.time()
    clean_user = username.lower().strip()
    keys = [f"ratelimit:ip:{client_ip}", f"ratelimit:user:{clean_user}"]

    r = get_redis_client()
    if r:
        try:
            for key in keys:
                pipe = r.pipeline()
                pipe.incr(key)
                pipe.expire(key, ATTEMPT_WINDOW_SECONDS)
                res = pipe.execute()
                attempts = res[0]
                if attempts >= MAX_ATTEMPTS:
                    r.setex(f"{key}:lockout", LOCKOUT_DURATION_SECONDS, "1")
            return
        except Exception as e:
            logger.warning("Redis failure recording failed; falling back to memory: %s", e)

    # In-memory fallback
    with _LOCK:
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
    clean_user = username.lower().strip()
    keys = [f"ratelimit:ip:{client_ip}", f"ratelimit:user:{clean_user}"]

    r = get_redis_client()
    if r:
        try:
            for key in keys:
                r.delete(key, f"{key}:lockout")
            return
        except Exception as e:
            logger.warning("Redis reset failed; clearing memory fallback: %s", e)

    with _LOCK:
        for key in keys:
            _LOGIN_ATTEMPTS.pop(key, None)

def reset_all_rate_limits() -> None:
    """Utility for testing teardown."""
    global _LOGIN_ATTEMPTS
    r = get_redis_client()
    if r:
        try:
            keys = r.keys("ratelimit:*")
            if keys:
                r.delete(*keys)
        except Exception:
            pass
    with _LOCK:
        _LOGIN_ATTEMPTS.clear()
