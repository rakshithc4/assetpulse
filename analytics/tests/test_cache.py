import time

from app.cache import ttl_cache


def test_ttl_cache_reuses_value_within_ttl():
    calls = 0

    @ttl_cache(seconds=60)
    async def fetch():
        nonlocal calls
        calls += 1
        return calls

    import asyncio

    async def run():
        first = await fetch()
        second = await fetch()
        return first, second

    first, second = asyncio.get_event_loop().run_until_complete(run())
    assert first == 1
    assert second == 1  # served from cache, function body did not run again


def test_ttl_cache_expires_after_ttl():
    calls = 0

    @ttl_cache(seconds=0.05)
    async def fetch():
        nonlocal calls
        calls += 1
        return calls

    import asyncio

    async def run():
        first = await fetch()
        time.sleep(0.1)
        second = await fetch()
        return first, second

    first, second = asyncio.get_event_loop().run_until_complete(run())
    assert first == 1
    assert second == 2
