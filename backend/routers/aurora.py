from fastapi import APIRouter
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.http_utils import build_response, json_error, log_timing, timing_start
from app.schemas import AuroraKpResponse, AuroraOvalResponse
from app.services.aurora import fetch_aurora_oval, fetch_planetary_kp

router = APIRouter()
PREFIX = "/api/aurora"


@router.get(f"{PREFIX}/oval")
async def aurora_oval(request: Request) -> JSONResponse:
    started = timing_start()
    request_id = request.headers.get("X-Request-Id")

    try:
        data = await fetch_aurora_oval()
    except Exception:
        return json_error(500, "Failed to fetch aurora oval", request_id=request_id)

    payload = AuroraOvalResponse(**data).model_dump(mode="json")
    log_timing("router.aurora_oval", started, f"status={payload.get('source_status')}")
    return build_response(
        payload,
        request_id=request_id,
        extra_headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=60"},
    )


@router.get(f"{PREFIX}/kp")
async def aurora_kp(request: Request) -> JSONResponse:
    started = timing_start()
    request_id = request.headers.get("X-Request-Id")

    try:
        data = await fetch_planetary_kp()
    except Exception:
        return json_error(500, "Failed to fetch aurora KP index", request_id=request_id)

    payload = AuroraKpResponse(**data).model_dump(mode="json")
    log_timing("router.aurora_kp", started, f"kp={payload.get('current_kp')} status={payload.get('source_status')}")
    return build_response(
        payload,
        request_id=request_id,
        extra_headers={"Cache-Control": "public, max-age=120, stale-while-revalidate=60"},
    )
