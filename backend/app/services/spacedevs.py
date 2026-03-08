from __future__ import annotations

import asyncio
import hashlib
import os
import time
from typing import Any, Dict, Literal, Optional, Tuple

import httpx

from app.http_utils import get_shared_async_client, log_timing, timing_start

from app.schemas import (
    SpaceDevsEndpointLatency,
    SpaceDevsErrorType,
    SpaceDevsLatencyProbe,
    SpaceDevsLatencySample,
    SpaceDevsValidationResult,
)

BASE_URL = "https://ll.thespacedevs.com/2.2.0/"
PRIMARY_VALIDATION_ENDPOINT = "launch/upcoming/?limit=1"
SECONDARY_VALIDATION_ENDPOINT = "astronaut/?limit=1"
REQUEST_TIMEOUT_SECONDS = 5.0
MAX_5XX_RETRIES = 2
RETRY_BASE_DELAY_SECONDS = 0.25
CACHE_TTL_SECONDS = 300

AuthMode = Literal["token", "anon"]

_validation_cache: Dict[str, Tuple[float, SpaceDevsValidationResult]] = {}


def _mask_api_key(api_key: str) -> str:
    if not api_key:
        return "****"
    if len(api_key) <= 8:
        return f"{api_key[:2]}****{api_key[-2:]}"
    return f"{api_key[:4]}****{api_key[-4:]}"


def _safe_preview(text: str, max_len: int = 500) -> Optional[str]:
    trimmed = text.strip()
    if not trimmed:
        return None
    if len(trimmed) <= max_len:
        return trimmed
    return f"{trimmed[:max_len]}..."


def _cache_key(mode: AuthMode, api_key: str) -> str:
    if mode == "anon":
        return "ANON"
    digest = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    return f"TOKEN:{digest}"


def _number_header(headers: httpx.Headers, name: str) -> Optional[int]:
    value = headers.get(name)
    if not value:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _classify_status(
    status_code: int,
    has_token: bool,
    remaining: Optional[int],
) -> Tuple[bool, bool, Optional[SpaceDevsErrorType]]:
    if status_code == 200:
        return True, remaining == 0, None
    if status_code in (401, 403):
        return False, False, "INVALID_KEY" if has_token else "UNKNOWN"
    if status_code == 429:
        return False, True, "RATE_LIMIT"
    if 500 <= status_code <= 599:
        return False, False, "UNKNOWN"
    return False, False, "UNKNOWN"


async def validate_spacedevs_api_key(auth_mode: AuthMode = "token") -> SpaceDevsValidationResult:
    api_key = (os.environ.get("SPACEDEVS_API_KEY") or "").strip()
    has_token = auth_mode == "token" and bool(api_key)
    cache_key = _cache_key(auth_mode, api_key)

    cached = _validation_cache.get(cache_key)
    now = time.time()
    if cached and now < cached[0]:
        result = cached[1]
        payload = dict(result.rawResponse or {})
        payload["cache"] = "HIT"
        return SpaceDevsValidationResult(**{**result.model_dump(), "rawResponse": payload})

    url = f"{BASE_URL}{PRIMARY_VALIDATION_ENDPOINT}"

    for attempt in range(0, MAX_5XX_RETRIES + 1):
        started = time.time()
        try:
            headers = {"Accept": "application/json"}
            if has_token:
                headers["Authorization"] = f"Token {api_key}"

            req_started = timing_start()
            client = get_shared_async_client("spacedevs", REQUEST_TIMEOUT_SECONDS)
            response = await client.get(url, headers=headers)
            log_timing(
                "spacedevs.validate_http",
                req_started,
                f"status={response.status_code} attempt={attempt + 1} mode={'token' if has_token else 'anon'}",
            )

            elapsed_ms = int((time.time() - started) * 1000)
            body_text = response.text
            rate_limit_limit = _number_header(response.headers, "X-RateLimit-Limit")
            rate_limit_remaining = _number_header(response.headers, "X-RateLimit-Remaining")
            retry_after = response.headers.get("Retry-After")

            valid, rate_limited, error_type = _classify_status(response.status_code, has_token, rate_limit_remaining)

            result = SpaceDevsValidationResult(
                valid=valid,
                statusCode=response.status_code,
                rateLimited=rate_limited,
                quotaRemaining=rate_limit_remaining,
                errorType=error_type,
                rawResponse={
                    "endpoint": PRIMARY_VALIDATION_ENDPOINT,
                    "statusText": response.reason_phrase,
                    "rateLimit": {
                        "limit": rate_limit_limit,
                        "remaining": rate_limit_remaining,
                        "retryAfter": retry_after,
                    },
                    "request": {
                        "timeoutMs": int(REQUEST_TIMEOUT_SECONDS * 1000),
                        "attempt": attempt + 1,
                        "latencyMs": elapsed_ms,
                        "authMode": "TOKEN" if has_token else "ANON",
                        "apiKeyMasked": _mask_api_key(api_key) if has_token else None,
                    },
                    "bodyPreview": _safe_preview(body_text),
                    "cache": "MISS",
                },
            )

            if 500 <= response.status_code <= 599 and attempt < MAX_5XX_RETRIES:
                await asyncio.sleep(RETRY_BASE_DELAY_SECONDS * (2 ** attempt))
                continue

            _validation_cache[cache_key] = (time.time() + CACHE_TTL_SECONDS, result)
            return result
        except (httpx.TimeoutException, httpx.NetworkError, httpx.TransportError) as error:
            elapsed_ms = int((time.time() - started) * 1000)
            return SpaceDevsValidationResult(
                valid=False,
                statusCode=0,
                rateLimited=False,
                errorType="NETWORK",
                rawResponse={
                    "endpoint": PRIMARY_VALIDATION_ENDPOINT,
                    "request": {
                        "timeoutMs": int(REQUEST_TIMEOUT_SECONDS * 1000),
                        "attempt": attempt + 1,
                        "latencyMs": elapsed_ms,
                        "authMode": "TOKEN" if has_token else "ANON",
                        "apiKeyMasked": _mask_api_key(api_key) if has_token else None,
                    },
                    "networkError": {
                        "type": "FETCH_FAILURE",
                        "message": str(error),
                    },
                    "cache": "MISS",
                },
            )

    return SpaceDevsValidationResult(
        valid=False,
        statusCode=0,
        rateLimited=False,
        errorType="UNKNOWN",
        rawResponse={
            "message": "Unexpected validator state reached.",
        },
    )


async def _measure_endpoint_latency(auth_mode: AuthMode, endpoint: str, samples: int = 3) -> SpaceDevsEndpointLatency:
    api_key = (os.environ.get("SPACEDEVS_API_KEY") or "").strip()
    has_token = auth_mode == "token" and bool(api_key)
    latencies = []

    for sample in range(1, samples + 1):
        started = time.time()
        try:
            headers = {"Accept": "application/json"}
            if has_token:
                headers["Authorization"] = f"Token {api_key}"

            req_started = timing_start()
            client = get_shared_async_client("spacedevs", REQUEST_TIMEOUT_SECONDS)
            response = await client.get(f"{BASE_URL}{endpoint}", headers=headers)
            log_timing(
                "spacedevs.probe_http",
                req_started,
                f"endpoint={endpoint} sample={sample} status={response.status_code}",
            )

            latencies.append(
                SpaceDevsLatencySample(
                    sample=sample,
                    latencyMs=int((time.time() - started) * 1000),
                    statusCode=response.status_code,
                )
            )
        except (httpx.TimeoutException, httpx.NetworkError, httpx.TransportError) as error:
            latencies.append(
                SpaceDevsLatencySample(
                    sample=sample,
                    latencyMs=int((time.time() - started) * 1000),
                    statusCode=0,
                    error=str(error),
                )
            )

    successful = [entry.latencyMs for entry in latencies if entry.statusCode > 0]
    average = round(sum(successful) / len(successful)) if successful else None

    return SpaceDevsEndpointLatency(
        endpoint=endpoint,
        samples=samples,
        averageResponseTimeMs=average,
        latencies=latencies,
    )


async def run_secondary_latency_probe(auth_mode: AuthMode = "token", samples: int = 3) -> SpaceDevsLatencyProbe:
    primary, secondary = await asyncio.gather(
        _measure_endpoint_latency(auth_mode, PRIMARY_VALIDATION_ENDPOINT, samples=samples),
        _measure_endpoint_latency(auth_mode, SECONDARY_VALIDATION_ENDPOINT, samples=samples),
    )

    faster_endpoint = None
    if primary.averageResponseTimeMs is not None and secondary.averageResponseTimeMs is not None:
        faster_endpoint = (
            PRIMARY_VALIDATION_ENDPOINT
            if primary.averageResponseTimeMs <= secondary.averageResponseTimeMs
            else SECONDARY_VALIDATION_ENDPOINT
        )

    return SpaceDevsLatencyProbe(
        primary=primary,
        secondary=secondary,
        fasterEndpoint=faster_endpoint,
    )
