import time
from collections.abc import Callable
from functools import wraps


def ttl_cache(seconds: float):
    def decorator(fn: Callable):
        store: dict[str, tuple[float, object]] = {}

        @wraps(fn)
        async def wrapper(*args, **kwargs):
            key = repr((args, kwargs))
            now = time.monotonic()
            if key in store:
                cached_at, value = store[key]
                if now - cached_at < seconds:
                    return value
            value = await fn(*args, **kwargs)
            store[key] = (now, value)
            return value

        return wrapper

    return decorator
