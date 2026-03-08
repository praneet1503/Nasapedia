import os
from threading import Lock

from sqlalchemy import create_engine, Engine

_engine_cache: dict[str, Engine] = {}
_engine_cache_lock = Lock()

def get_required_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise ValueError(f"Environment variable {key} is not set")
    return val

def create_db_engine(database_url: str) -> Engine:
    """Return a cached SQLAlchemy Engine per database URL."""
    existing = _engine_cache.get(database_url)
    if existing is not None:
        return existing

    with _engine_cache_lock:
        existing = _engine_cache.get(database_url)
        if existing is not None:
            return existing
        engine = create_engine(
            database_url,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        _engine_cache[database_url] = engine
        return engine


def close_all_db_engines() -> None:
    """Dispose all cached engines during shutdown."""
    with _engine_cache_lock:
        engines = list(_engine_cache.values())
        _engine_cache.clear()

    for engine in engines:
        try:
            engine.dispose()
        except Exception:
            pass
