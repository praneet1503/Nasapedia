from fastapi import APIRouter
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core import DatabaseQueryFailed, DatabaseUnavailable
from app.db import get_required_env
from app.http_utils import build_response, json_error
from app.schemas import ProjectClickIn
from app.services.feed import record_project_click

router = APIRouter()


def _record_click_impl(request: Request, project_id_value: str) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")

    try:
        project_id_int = int(project_id_value)
    except ValueError:
        return json_error(400, "Invalid project_id", request_id=request_id)

    raw_payload = {
        "visitor_uuid": request.headers.get("X-Visitor-UUID") or request.query_params.get("visitor_uuid")
    }

    try:
        payload = ProjectClickIn.model_validate(raw_payload)
    except ValidationError as exc:
        return build_response(
            {"error": "Invalid request body", "details": exc.errors()},
            status_code=400,
            request_id=request_id,
        )

    try:
        result = record_project_click(
            get_required_env("DATABASE_URL"),
            str(payload.visitor_uuid),
            project_id_int,
        )
    except DatabaseUnavailable:
        return json_error(503, "Database unavailable", request_id=request_id)
    except DatabaseQueryFailed:
        return json_error(500, "Database query failed", request_id=request_id)
    except Exception:
        return json_error(500, "Unexpected error", request_id=request_id)

    return build_response(result, request_id=request_id)


@router.post("/projects/{project_id}/click")
async def record_click(project_id: int, request: Request) -> JSONResponse:
    return _record_click_impl(request, str(project_id))


@router.post("/projects-click")
async def record_click_compat(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    project_id = request.query_params.get("project_id")
    if project_id is None:
        return json_error(400, "Missing project_id", request_id=request_id)
    return _record_click_impl(request, project_id)
