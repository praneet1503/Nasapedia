from typing import Dict

from fastapi import APIRouter

from app.core import DatabaseUnavailable, db_health_check
from app.db import get_required_env
from app.http_utils import json_error

router = APIRouter()


@router.get("/health")
async def health() -> Dict[str, str]:
    try:
        db_health_check(get_required_env("DATABASE_URL"))
    except DatabaseUnavailable:
        return json_error(503, "Database unavailable")
    except Exception:
        return json_error(500, "Unexpected error")
    return {"status": "ok"}
