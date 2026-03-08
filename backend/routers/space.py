from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import APIRouter

from app.http_utils import build_response, json_error, log_timing, timing_start
from app.schemas import SpaceContentParams, SpaceContentResponse
from app.services.spaceflight_news import get_space_articles, get_space_blogs

router = APIRouter()
PREFIX = "/api/space"


@router.get(f"{PREFIX}/articles")
async def space_articles(request: Request) -> JSONResponse:
    started = timing_start()
    request_id = request.headers.get("X-Request-Id")

    try:
        params = SpaceContentParams.model_validate(dict(request.query_params))
    except ValidationError as exc:
        return build_response(
            {"error": "Invalid query parameters", "details": exc.errors()},
            status_code=400,
            request_id=request_id,
        )

    try:
        data = await get_space_articles(
            limit=params.safe_limit,
            offset=params.safe_offset,
        )
    except Exception:
        return json_error(500, "Failed to fetch space articles", request_id=request_id)

    payload = SpaceContentResponse(**data).model_dump(mode="json")
    log_timing("router.space_articles", started, f"items={len(payload.get('items', []))}")
    return build_response(
        payload,
        request_id=request_id,
        extra_headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=60"},
    )


@router.get(f"{PREFIX}/blogs")
async def space_blogs(request: Request) -> JSONResponse:
    started = timing_start()
    request_id = request.headers.get("X-Request-Id")

    try:
        params = SpaceContentParams.model_validate(dict(request.query_params))
    except ValidationError as exc:
        return build_response(
            {"error": "Invalid query parameters", "details": exc.errors()},
            status_code=400,
            request_id=request_id,
        )

    try:
        data = await get_space_blogs(
            limit=params.safe_limit,
            offset=params.safe_offset,
        )
    except Exception:
        return json_error(500, "Failed to fetch space blogs", request_id=request_id)

    payload = SpaceContentResponse(**data).model_dump(mode="json")
    log_timing("router.space_blogs", started, f"items={len(payload.get('items', []))}")
    return build_response(
        payload,
        request_id=request_id,
        extra_headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=60"},
    )
