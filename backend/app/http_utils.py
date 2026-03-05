from typing import Any, Dict, List, Union

from starlette.responses import JSONResponse

from app.schemas import ErrorResponse


def build_response(
    payload: Union[Dict[str, Any], List],
    status_code: int = 200,
    request_id: Union[str, None] = None,
    extra_headers: Union[Dict[str, str], None] = None,
) -> JSONResponse:
    headers: Dict[str, str] = {}
    if request_id:
        headers["X-Request-Id"] = request_id
    if extra_headers:
        headers.update(extra_headers)
    return JSONResponse(payload, status_code=status_code, headers=headers)


def json_error(status_code: int, message: str, request_id: Union[str, None] = None) -> JSONResponse:
    payload = ErrorResponse(error=message).model_dump()
    return build_response(payload, status_code=status_code, request_id=request_id)
