"""
Spaceflight News API Service
─────────────────────────────
Proxies requests to the Spaceflight News API (v4) with in-memory
caching, retry logic, and response normalization.

All items are normalized to a flat shape before returning so that
routers and consumers never deal with upstream schema changes.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

# ── Spaceflight News API Configuration ────────────────────────

BASE_URL = "https://api.spaceflightnewsapi.net/v4"
REQUEST_TIMEOUT = 15.0
MAX_RETRIES = 2
RETRY_DELAY = 0.5
CACHE_TTL = 3600  # 1 hour

# ── In-Memory Cache ───────────────────────────────────────────

_cache: Dict[str, Tuple[float, Any]] = {}


def _get_cached(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None


def _set_cached(key: str, value: Any, ttl: int = CACHE_TTL) -> None:
    _cache[key] = (time.time() + ttl, value)


# ── Response Normalization ────────────────────────────────────

def _normalize_item(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Extract only the fields the frontend contract requires."""
    return {
        "id": raw.get("id"),
        "title": raw.get("title", ""),
        "summary": raw.get("summary", ""),
        "image_url": raw.get("image_url", ""),
        "news_site": raw.get("news_site", ""),
        "published_at": raw.get("published_at", ""),
        "url": raw.get("url", ""),
    }


EMPTY_RESPONSE: Dict[str, Any] = {"items": [], "next": None, "previous": None}


# ── Generic Fetch Helper ─────────────────────────────────────

async def _fetch_spaceflight(
    endpoint: str,
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Fetch from Spaceflight News API with caching, retry, and
    normalization.  Returns the standard envelope:
      { items: [...], next: str|null, previous: str|null }
    On any failure the function returns EMPTY_RESPONSE instead of
    raising, so routers always have a safe payload.
    """
    cache_key = f"sfn:{endpoint}:{limit}:{offset}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    url = f"{BASE_URL}/{endpoint}/"
    params = {
        "limit": limit,
        "offset": offset,
        "ordering": "-published_at",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                resp = await client.get(
                    url,
                    params=params,
                    headers={"Accept": "application/json"},
                )

                if resp.status_code == 429:
                    # Rate-limited — return empty rather than partial data
                    return dict(EMPTY_RESPONSE)

                if 500 <= resp.status_code <= 599:
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                        continue
                    return dict(EMPTY_RESPONSE)

                if resp.status_code != 200:
                    return dict(EMPTY_RESPONSE)

                data = resp.json()
                result = {
                    "items": [_normalize_item(r) for r in data.get("results", [])],
                    "next": data.get("next"),
                    "previous": data.get("previous"),
                }
                _set_cached(cache_key, result)
                return result

        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                continue
            return dict(EMPTY_RESPONSE)

    return dict(EMPTY_RESPONSE)


# ── Public API ────────────────────────────────────────────────

async def get_space_articles(limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    return await _fetch_spaceflight("articles", limit=limit, offset=offset)


async def get_space_blogs(limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    return await _fetch_spaceflight("blogs", limit=limit, offset=offset)
