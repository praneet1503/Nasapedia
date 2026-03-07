from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import APIRouter

from app.core import DatabaseQueryFailed, DatabaseUnavailable
from app.db import get_required_env
from app.http_utils import build_response, json_error
from app.schemas import FeedParams, ProjectFeedOut
from app.services.feed import get_adaptive_feed

router = APIRouter()


@router.get("/feed")
async def feed(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    visitor_uuid = request.headers.get("X-Visitor-UUID")

    try:
        params = FeedParams.model_validate(dict(request.query_params))
    except ValidationError as exc:
        return build_response(
            {"error": "Invalid query parameters", "details": exc.errors()},
            status_code=400,
            request_id=request_id,
        )

    try:
        rows, total = get_adaptive_feed(
            get_required_env("DATABASE_URL"),
            page=params.page,
            per_page=20,
            visitor_uuid=visitor_uuid,
            include_empty_descriptions=params.include_empty_descriptions,
        )
    except DatabaseUnavailable:
        return json_error(503, "Database unavailable", request_id=request_id)
    except DatabaseQueryFailed:
        return json_error(500, "Database query failed", request_id=request_id)
    except Exception:
        return json_error(500, "Unexpected error", request_id=request_id)

    page_size = 20
    payload = {
        "data": [ProjectFeedOut(**row).model_dump(mode="json") for row in rows],
        "page": params.page,
        "pageSize": page_size,
        "totalCount": total,
        "totalPages": (total + page_size - 1) // page_size if page_size > 0 else 0,
    }
    return build_response(payload, request_id=request_id)
