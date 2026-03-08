import logging
import time
from threading import Lock
from typing import Any, Dict, List, Union

import httpx

from starlette.responses import JSONResponse

from app.schemas import ErrorResponse

_logger = logging.getLogger(__name__)

_shared_async_clients: Dict[str, httpx.AsyncClient] = {}
_shared_async_clients_lock = Lock()


def get_shared_async_client(name: str, timeout_seconds: float) -> httpx.AsyncClient:
    """Return a shared AsyncClient keyed by logical name + timeout."""
    key = f"{name}:{timeout_seconds}"
    existing = _shared_async_clients.get(key)
    if existing is not None:
        return existing

    with _shared_async_clients_lock:
        existing = _shared_async_clients.get(key)
        if existing is not None:
            return existing
        client = httpx.AsyncClient(timeout=timeout_seconds)
        _shared_async_clients[key] = client
        return client


async def close_shared_async_clients() -> None:
    """Close all shared AsyncClients during app shutdown."""
    with _shared_async_clients_lock:
        clients = list(_shared_async_clients.values())
        _shared_async_clients.clear()

    for client in clients:
        try:
            await client.aclose()
        except Exception:
            pass


def timing_start() -> float:
    return time.perf_counter()


def timing_ms(start: float) -> float:
    return (time.perf_counter() - start) * 1000.0


def log_timing(scope: str, start: float, details: str = "") -> float:
    elapsed = timing_ms(start)
    if details:
        _logger.info("%s: %.1fms | %s", scope, elapsed, details)
    else:
        _logger.info("%s: %.1fms", scope, elapsed)
    return elapsed


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
