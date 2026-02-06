import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from a local .env file (development convenience)
# .env is ignored by git. For Neon, use the DATABASE_URL env var and don't commit secrets.
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DATABASE_URL = get_required_env("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
)
