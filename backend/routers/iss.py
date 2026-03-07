from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any, Dict, Optional, Set

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.db import create_db_engine, get_required_env
from app.schemas import IssLocationOut, ErrorResponse

# yes we are literally tracking a tin can hurtling at 28,000 km/h. beautiful no ?????
ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544"
CACHE_TTL_SECONDS = 2
PUSH_INTERVAL_SECONDS = 1
LEASE_SECONDS = 3
STALE_BROADCAST_WINDOW_SECONDS = 30
ISS_STREAM_ROW_ID = 1

router = APIRouter()
# in-memory cache. if the server restarts, this dies. silence.
_iss_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": 0.0,
}

# WebSocket clients registered for live updates
_ws_clients: Set[WebSocket] = set()
_ws_poller_task: Optional[asyncio.Task] = None
_iss_db_engine: Optional[Engine] = None
_iss_http_client: Optional[httpx.AsyncClient] = None


def _get_iss_db_engine() -> Optional[Engine]:
    global _iss_db_engine
    if _iss_db_engine is not None:
        return _iss_db_engine
    try:
        database_url = get_required_env("DATABASE_URL")
    except Exception:
        return None
    _iss_db_engine = create_db_engine(database_url)
    return _iss_db_engine


def _ensure_state_row_exists() -> None:
    engine = _get_iss_db_engine()
    if engine is None:
        return

    ddl_table = text(
        "CREATE TABLE IF NOT EXISTS iss_stream_state ("
        "id SMALLINT PRIMARY KEY, "
        "leader_instance TEXT, "
        "lease_expires_at TIMESTAMPTZ, "
        "latest_payload JSONB, "
        "latest_timestamp BIGINT, "
        "latest_received_at TIMESTAMPTZ, "
        "upstream_ok BOOLEAN DEFAULT TRUE, "
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
        ")"
    )
    ddl_lease_index = text(
        "CREATE INDEX IF NOT EXISTS idx_iss_stream_lease_expires "
        "ON iss_stream_state (lease_expires_at)"
    )
    ddl_ts_index = text(
        "CREATE INDEX IF NOT EXISTS idx_iss_stream_latest_timestamp "
        "ON iss_stream_state (latest_timestamp)"
    )
    sql = text("INSERT INTO iss_stream_state (id) VALUES (:id) ON CONFLICT (id) DO NOTHING")

    with engine.begin() as conn:
        conn.execute(ddl_table)
        conn.execute(ddl_lease_index)
        conn.execute(ddl_ts_index)
        conn.execute(sql, {"id": ISS_STREAM_ROW_ID})


def _try_acquire_or_renew_leadership(instance_id: str) -> bool:
    engine = _get_iss_db_engine()
    if engine is None:
        return True

    sql = text(
        "UPDATE iss_stream_state "
        "SET leader_instance = :instance_id, "
        "    lease_expires_at = NOW() + (:lease_seconds * INTERVAL '1 second'), "
        "    updated_at = NOW() "
        "WHERE id = :id "
        "  AND (leader_instance = :instance_id OR lease_expires_at IS NULL OR lease_expires_at < NOW())"
    )
    try:
        with engine.begin() as conn:
            result = conn.execute(
                sql,
                {
                    "instance_id": instance_id,
                    "lease_seconds": LEASE_SECONDS,
                    "id": ISS_STREAM_ROW_ID,
                },
            )
            return result.rowcount > 0
    except Exception:
        # If coordination storage is unavailable, fall back to local leadership.
        return True


def _write_latest_snapshot(payload: Dict[str, Any], upstream_ok: bool) -> None:
    engine = _get_iss_db_engine()
    if engine is None:
        return

    sql = text(
        "UPDATE iss_stream_state "
        "SET latest_payload = CAST(:payload AS jsonb), "
        "    latest_timestamp = :latest_timestamp, "
        "    latest_received_at = NOW(), "
        "    upstream_ok = :upstream_ok, "
        "    updated_at = NOW() "
        "WHERE id = :id"
    )

    with engine.begin() as conn:
        conn.execute(
            sql,
            {
                "payload": json.dumps(payload),
                "latest_timestamp": int(payload.get("timestamp", 0)),
                "upstream_ok": upstream_ok,
                "id": ISS_STREAM_ROW_ID,
            },
        )


def _read_latest_snapshot() -> Optional[Dict[str, Any]]:
    engine = _get_iss_db_engine()
    if engine is None:
        cached = _iss_cache.get("data")
        return cached if isinstance(cached, dict) else None

    sql = text(
        "SELECT latest_payload, latest_received_at "
        "FROM iss_stream_state "
        "WHERE id = :id"
    )
    try:
        with engine.connect() as conn:
            row = conn.execute(sql, {"id": ISS_STREAM_ROW_ID}).mappings().first()
    except Exception:
        cached = _iss_cache.get("data")
        return cached if isinstance(cached, dict) else None
    if not row:
        return None
    payload = row.get("latest_payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return None
    if payload is None or not isinstance(payload, dict):
        return None
    return payload


def _is_cache_fresh() -> bool:
    now = time.time()
    return (
        _iss_cache["data"] is not None
        and (now - float(_iss_cache["last_updated"])) < CACHE_TTL_SECONDS
    )


def _normalize_payload(payload: Dict[str, Any]) -> IssLocationOut:
    latitude = float(payload["latitude"])
    longitude = float(payload["longitude"])
    velocity = float(payload["velocity"])
    visibility = str(payload["visibility"])
    timestamp = int(payload["timestamp"])
    altitude_raw: Optional[Any] = payload.get("altitude")
    altitude = float(altitude_raw) if altitude_raw is not None else None

    return IssLocationOut(
        latitude=latitude,
        longitude=longitude,
        velocity=velocity,
        visibility=visibility,
        timestamp=timestamp,
        altitude=altitude,
    )


async def _fetch_iss_data() -> IssLocationOut:
    global _iss_http_client
    if _iss_http_client is None:
        _iss_http_client = httpx.AsyncClient(timeout=5.0)

    response = await _iss_http_client.get(ISS_URL)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Invalid ISS payload")
    return _normalize_payload(payload)


async def _broadcast_to_clients(payload: Dict[str, Any]) -> None:
    disconnected: Set[WebSocket] = set()
    for ws in list(_ws_clients):
        try:
            await ws.send_json(payload)
        except Exception:
            # Mark as disconnected; they will be removed
            disconnected.add(ws)

    for ws in disconnected:
        try:
            _ws_clients.remove(ws)
        except KeyError:
            pass


async def _ws_poller_loop() -> None:
    # Single loop that polls the external API and updates the cache, then broadcasts
    instance_id = f"instance-{uuid.uuid4().hex}"
    last_broadcast_timestamp = 0

    try:
        _ensure_state_row_exists()
    except Exception:
        # Continue in local mode when DB coordination is unavailable.
        pass

    try:
        while True:
            loop_started = time.time()
            is_leader = _try_acquire_or_renew_leadership(instance_id)

            if is_leader:
                try:
                    normalized = await _fetch_iss_data()
                    response_payload = normalized.model_dump(mode="json", exclude_none=True)
                    response_payload["stale"] = False
                    _iss_cache["data"] = response_payload
                    _iss_cache["last_updated"] = time.time()
                    try:
                        _write_latest_snapshot(response_payload, upstream_ok=True)
                    except Exception:
                        pass
                    if _ws_clients:
                        await _broadcast_to_clients(response_payload)
                    last_broadcast_timestamp = int(response_payload.get("timestamp", last_broadcast_timestamp))
                except Exception:
                    cached = _read_latest_snapshot() or _iss_cache.get("data")
                    if isinstance(cached, dict):
                        stale_payload = dict(cached)
                        now = time.time()
                        age = now - float(stale_payload.get("timestamp") or 0.0)
                        if age <= STALE_BROADCAST_WINDOW_SECONDS:
                            stale_payload["stale"] = True
                            if _ws_clients:
                                await _broadcast_to_clients(stale_payload)

            if not is_leader:
                try:
                    snapshot = _read_latest_snapshot()
                    if isinstance(snapshot, dict):
                        snapshot_ts = int(snapshot.get("timestamp", 0))
                        if snapshot_ts >= last_broadcast_timestamp and _ws_clients:
                            await _broadcast_to_clients(snapshot)
                            last_broadcast_timestamp = snapshot_ts
                except Exception:
                    pass

            elapsed = time.time() - loop_started
            await asyncio.sleep(max(0.0, PUSH_INTERVAL_SECONDS - elapsed))
    except asyncio.CancelledError:
        return


def _ensure_poller_running() -> None:
    global _ws_poller_task
    if _ws_poller_task is None or _ws_poller_task.done():
        loop = asyncio.get_event_loop()
        _ws_poller_task = loop.create_task(_ws_poller_loop())


@router.get("/location")
async def get_iss_location() -> JSONResponse:
    shared_snapshot = _read_latest_snapshot()
    if isinstance(shared_snapshot, dict):
        _iss_cache["data"] = shared_snapshot
        _iss_cache["last_updated"] = time.time()
        return JSONResponse(shared_snapshot)

    if _is_cache_fresh():
        cached = _iss_cache["data"]
        return JSONResponse(cached)

    try:
        normalized = await _fetch_iss_data()
        response_payload = normalized.model_dump(mode="json", exclude_none=True)
        _iss_cache["data"] = response_payload
        _iss_cache["last_updated"] = time.time()
        return JSONResponse(response_payload)
    except Exception:
        error_payload = ErrorResponse(error="ISS data unavailable").model_dump()
        return JSONResponse(error_payload, status_code=503)


@router.websocket("/stream")
async def iss_stream_ws(websocket: WebSocket) -> None:
    # Accept connection and register client
    await websocket.accept()
    _ws_clients.add(websocket)
    # Ensure the poller is running
    _ensure_poller_running()

    # Send current cached value immediately if available
    try:
        if _is_cache_fresh():
            await websocket.send_json(_iss_cache["data"])
    except Exception:
        # If sending initial payload fails, close the connection
        try:
            await websocket.close()
        finally:
            _ws_clients.discard(websocket)
        return

    try:
        # Keep connection open and wait for client messages (client may never send)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
    except Exception:
        _ws_clients.discard(websocket)
