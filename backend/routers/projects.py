from fastapi import APIRouter
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core import (
    DatabaseQueryFailed,
    DatabaseUnavailable,
    ProjectNotFound,
    get_project,
    search_projects,
)
from app.db import get_required_env
from app.http_utils import build_response, json_error
from app.schemas import ProjectOut, ProjectSearchParams

router = APIRouter()


def _get_by_id_impl(request: Request, project_id_value: str) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")

    try:
        project_id_int = int(project_id_value)
    except ValueError:
        return json_error(400, "Invalid project_id", request_id=request_id)

    try:
        row = get_project(get_required_env("DATABASE_URL"), project_id_int)
    except ProjectNotFound:
        return json_error(404, "Project not found", request_id=request_id)
    except DatabaseUnavailable:
        return json_error(503, "Database unavailable", request_id=request_id)
    except DatabaseQueryFailed:
        return json_error(500, "Database query failed", request_id=request_id)
    except Exception:
        return json_error(500, "Unexpected error", request_id=request_id)

    return build_response(ProjectOut(**row).model_dump(mode="json"), request_id=request_id)


@router.get("/projects")
async def search(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")

    project_id = request.query_params.get("project_id")
    if project_id is not None:
        return _get_by_id_impl(request, project_id)

    try:
        params = ProjectSearchParams.model_validate(dict(request.query_params))
    except ValidationError as exc:
        return build_response(
            {"error": "Invalid query parameters", "details": exc.errors()},
            status_code=400,
            request_id=request_id,
        )

    try:
        search_type = request.query_params.get("search_type", "keyword")

        if search_type in ("semantic", "hybrid"):
            try:
                from app.semantic import search_projects_hybrid

                rows, total = search_projects_hybrid(
                    get_required_env("DATABASE_URL"),
                    {
                        "q": params.q,
                        "trl_min": params.trl_min,
                        "trl_max": params.trl_max,
                        "organization": params.organization,
                        "technology_area": params.technology_area,
                    },
                    params.limit,
                    params.offset,
                    params.order,
                    search_type=search_type,
                )
            except ImportError:
                rows, total = search_projects(
                    get_required_env("DATABASE_URL"),
                    {
                        "q": params.q,
                        "trl_min": params.trl_min,
                        "trl_max": params.trl_max,
                        "organization": params.organization,
                        "technology_area": params.technology_area,
                    },
                    params.limit,
                    params.offset,
                    params.order,
                )
        else:
            rows, total = search_projects(
                get_required_env("DATABASE_URL"),
                {
                    "q": params.q,
                    "trl_min": params.trl_min,
                    "trl_max": params.trl_max,
                    "organization": params.organization,
                    "technology_area": params.technology_area,
                },
                params.limit,
                params.offset,
                params.order,
            )
    except DatabaseUnavailable:
        return json_error(503, "Database unavailable", request_id=request_id)
    except DatabaseQueryFailed:
        return json_error(500, "Database query failed", request_id=request_id)
    except Exception:
        return json_error(500, "Unexpected error", request_id=request_id)

    payload = {
        "data": [ProjectOut(**row).model_dump(mode="json") for row in rows],
        "page": (params.offset // params.limit) + 1,
        "pageSize": params.limit,
        "totalCount": total,
        "totalPages": (total + params.limit - 1) // params.limit if params.limit > 0 else 0,
    }
    return build_response(payload, request_id=request_id)


@router.get("/projects/{project_id}")
async def get_by_id(project_id: int, request: Request) -> JSONResponse:
    return _get_by_id_impl(request, str(project_id))


@router.get("/projects-id")
async def get_by_id_compat(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    project_id = request.query_params.get("project_id")
    if project_id is None:
        return json_error(400, "Missing project_id", request_id=request_id)
    return _get_by_id_impl(request, project_id)
