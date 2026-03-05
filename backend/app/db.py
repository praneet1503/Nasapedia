import os
from sqlalchemy import create_engine, Engine

def get_required_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise ValueError(f"Environment variable {key} is not set")
    return val

def create_db_engine(database_url: str) -> Engine:
    # Optimized connection pooling for concurrent searches
    # pool_size: max number of persistent connections per process
    # max_overflow: max additional connections above pool_size
    # pool_pre_ping: test connections before use (prevents stale connections)
    # pool_recycle: recycle connections after 3600s to handle DB server timeouts
    return create_engine(
        database_url,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
