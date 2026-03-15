"""
Aurora Service
──────────────
Fetches NOAA SWPC aurora oval, planetary Kp index, and solar wind plasma
feeds with in-memory caching, retry logic, and normalized response payloads.
"""

from __future__ import annotations

import asyncio
import copy
import math
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.http_utils import get_shared_async_client, log_timing, timing_start

OVATION_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"
KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
SOLAR_WIND_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"

REQUEST_TIMEOUT = 15.0
MAX_RETRIES = 2
RETRY_DELAY = 0.5
CACHE_TTL = 120

_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_last_good: Dict[str, Dict[str, Any]] = {}


def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    entry = _cache.get(key)
    if entry and time.time() < entry[0]:
        return copy.deepcopy(entry[1])
    return None


def _get_stale(key: str) -> Optional[Dict[str, Any]]:
    value = _last_good.get(key)
    if value is None:
        return None
    return copy.deepcopy(value)


def _set_cached(key: str, value: Dict[str, Any], ttl: int = CACHE_TTL) -> None:
    snapshot = copy.deepcopy(value)
    _cache[key] = (time.time() + ttl, snapshot)
    _last_good[key] = snapshot


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_lon(value: float) -> float:
    if value > 180.0:
        return value - 360.0
    if value < -180.0:
        return value + 360.0
    return value


async def _fetch_json(url: str, scope: str) -> Optional[Any]:
    started = timing_start()

    for attempt in range(MAX_RETRIES + 1):
        try:
            req_started = timing_start()
            client = get_shared_async_client("aurora", REQUEST_TIMEOUT)
            response = await client.get(url, headers={"Accept": "application/json"})
            log_timing(
                "aurora.http",
                req_started,
                f"scope={scope} attempt={attempt + 1} status={response.status_code}",
            )

            if response.status_code == 429:
                break

            if 500 <= response.status_code <= 599:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                    continue
                break

            if response.status_code != 200:
                break

            return response.json()
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                continue
            break
        except ValueError:
            break

    log_timing("aurora.fetch", started, f"scope={scope} status=failed")
    return None


def _build_band(
    buckets: Dict[int, List[float]],
    hemisphere: str,
) -> Dict[str, List[List[float]]]:
    lon_centers = [-175.0 + (10.0 * index) for index in range(36)]

    equator_default = 62.0 if hemisphere == "north" else -62.0
    pole_default = 80.0 if hemisphere == "north" else -80.0

    equator_edge: List[List[float]] = []
    pole_edge: List[List[float]] = []

    for index, lon in enumerate(lon_centers):
        lats = buckets.get(index, [])
        if lats:
            if hemisphere == "north":
                equator_lat = max(45.0, min(lats))
                pole_lat = min(89.0, max(lats))
            else:
                equator_lat = min(-45.0, max(lats))
                pole_lat = max(-89.0, min(lats))
        else:
            equator_lat = equator_default
            pole_lat = pole_default

        equator_edge.append([round(equator_lat, 2), round(lon, 2)])
        pole_edge.append([round(pole_lat, 2), round(lon, 2)])

    return {
        "equator_edge": equator_edge,
        "pole_edge": pole_edge,
    }


def _normalize_oval(raw: Dict[str, Any]) -> Dict[str, Any]:
    coordinates = raw.get("coordinates")
    if not isinstance(coordinates, list):
        raise ValueError("Invalid ovation payload")

    threshold = 3.0
    north_buckets: Dict[int, List[float]] = {}
    south_buckets: Dict[int, List[float]] = {}
    north_peak = 0.0
    south_peak = 0.0

    for row in coordinates:
        if not isinstance(row, list) or len(row) < 3:
            continue

        lon = _to_float(row[0])
        lat = _to_float(row[1])
        intensity = _to_float(row[2])
        if lon is None or lat is None or intensity is None:
            continue

        lon = _normalize_lon(lon)
        if lon < -180.0 or lon > 180.0 or lat < -90.0 or lat > 90.0:
            continue

        if intensity < threshold:
            continue

        bucket_index = int(math.floor((lon + 180.0) / 10.0))
        bucket_index = max(0, min(35, bucket_index))

        if lat >= 0:
            north_buckets.setdefault(bucket_index, []).append(lat)
            north_peak = max(north_peak, intensity)
        else:
            south_buckets.setdefault(bucket_index, []).append(lat)
            south_peak = max(south_peak, intensity)

    return {
        "updated_at": raw.get("Observation Time"),
        "forecast_at": raw.get("Forecast Time"),
        "threshold": threshold,
        "north_band": _build_band(north_buckets, hemisphere="north"),
        "south_band": _build_band(south_buckets, hemisphere="south"),
        "north_peak": round(north_peak, 2),
        "south_peak": round(south_peak, 2),
        "source_status": "ok",
        "stale": False,
    }


def _empty_oval(status: str) -> Dict[str, Any]:
    return {
        "updated_at": None,
        "forecast_at": None,
        "threshold": 3.0,
        "north_band": {"equator_edge": [], "pole_edge": []},
        "south_band": {"equator_edge": [], "pole_edge": []},
        "north_peak": 0.0,
        "south_peak": 0.0,
        "source_status": status,
        "stale": status == "stale",
    }


def _normalize_kp(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, list):
        raise ValueError("Invalid KP payload")

    rows = raw
    if rows and isinstance(rows[0], list) and rows[0] and str(rows[0][0]).lower() == "time_tag":
        rows = rows[1:]

    points: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 2:
            continue
        time_tag = row[0]
        kp = _to_float(row[1])
        if kp is None:
            continue
        points.append({"time_tag": str(time_tag), "kp": round(kp, 2)})

    current = points[-1] if points else {"time_tag": None, "kp": 0.0}

    return {
        "current_kp": current["kp"],
        "observed_at": current["time_tag"],
        "recent": points[-8:],
        "source_status": "ok",
        "stale": False,
    }


def _empty_kp(status: str) -> Dict[str, Any]:
    return {
        "current_kp": 0.0,
        "observed_at": None,
        "recent": [],
        "source_status": status,
        "stale": status == "stale",
    }


def _normalize_solar_wind(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, list):
        raise ValueError("Invalid solar wind payload")

    rows = raw
    if rows and isinstance(rows[0], list) and rows[0] and str(rows[0][0]).lower() == "time_tag":
        rows = rows[1:]

    valid_rows: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 3:
            continue
        observed_at = str(row[0])
        density = _to_float(row[1])
        speed = _to_float(row[2])
        if density is None or speed is None:
            continue
        valid_rows.append({
            "observed_at": observed_at,
            "density_cm3": density,
            "speed_km_s": speed,
        })

    if not valid_rows:
        return {
            "observed_at": None,
            "density_cm3": None,
            "speed_km_s": None,
            "speed_10m_avg_km_s": None,
            "density_10m_avg_cm3": None,
            "source_status": "error",
            "stale": False,
        }

    latest = valid_rows[-1]
    recent = valid_rows[-10:]
    avg_speed = sum(item["speed_km_s"] for item in recent) / len(recent)
    avg_density = sum(item["density_cm3"] for item in recent) / len(recent)

    return {
        "observed_at": latest["observed_at"],
        "density_cm3": round(latest["density_cm3"], 2),
        "speed_km_s": round(latest["speed_km_s"], 2),
        "speed_10m_avg_km_s": round(avg_speed, 2),
        "density_10m_avg_cm3": round(avg_density, 2),
        "source_status": "ok",
        "stale": False,
    }


def _empty_solar(status: str) -> Dict[str, Any]:
    return {
        "observed_at": None,
        "density_cm3": None,
        "speed_km_s": None,
        "speed_10m_avg_km_s": None,
        "density_10m_avg_cm3": None,
        "source_status": status,
        "stale": status == "stale",
    }


async def fetch_aurora_oval() -> Dict[str, Any]:
    started = timing_start()
    key = "aurora:oval"

    cached = _get_cached(key)
    if cached is not None:
        log_timing("aurora.oval", started, "cache=hit")
        return cached

    raw = await _fetch_json(OVATION_URL, "oval")
    if isinstance(raw, dict):
        try:
            payload = _normalize_oval(raw)
            _set_cached(key, payload)
            log_timing("aurora.oval", started, "cache=miss status=ok")
            return payload
        except ValueError:
            pass

    stale = _get_stale(key)
    if stale is not None:
        stale["source_status"] = "stale"
        stale["stale"] = True
        log_timing("aurora.oval", started, "cache=stale status=fallback")
        return stale

    log_timing("aurora.oval", started, "status=empty")
    return _empty_oval("error")


async def fetch_solar_wind() -> Dict[str, Any]:
    started = timing_start()
    key = "aurora:solar"

    cached = _get_cached(key)
    if cached is not None:
        log_timing("aurora.solar", started, "cache=hit")
        return cached

    raw = await _fetch_json(SOLAR_WIND_URL, "solar")
    if isinstance(raw, list):
        try:
            payload = _normalize_solar_wind(raw)
            if payload["source_status"] == "ok":
                _set_cached(key, payload)
            log_timing("aurora.solar", started, f"cache=miss status={payload['source_status']}")
            return payload
        except ValueError:
            pass

    stale = _get_stale(key)
    if stale is not None:
        stale["source_status"] = "stale"
        stale["stale"] = True
        log_timing("aurora.solar", started, "cache=stale status=fallback")
        return stale

    log_timing("aurora.solar", started, "status=empty")
    return _empty_solar("error")


async def fetch_planetary_kp() -> Dict[str, Any]:
    started = timing_start()
    key = "aurora:kp"

    cached = _get_cached(key)
    if cached is not None:
        log_timing("aurora.kp", started, "cache=hit")
        return cached

    solar_wind = await fetch_solar_wind()
    raw = await _fetch_json(KP_URL, "kp")
    if isinstance(raw, list):
        try:
            payload = _normalize_kp(raw)
            payload["solar_wind"] = solar_wind
            _set_cached(key, payload)
            log_timing("aurora.kp", started, "cache=miss status=ok")
            return payload
        except ValueError:
            pass

    stale = _get_stale(key)
    if stale is not None:
        stale["source_status"] = "stale"
        stale["stale"] = True
        stale["solar_wind"] = solar_wind
        log_timing("aurora.kp", started, "cache=stale status=fallback")
        return stale

    payload = _empty_kp("error")
    payload["solar_wind"] = solar_wind
    log_timing("aurora.kp", started, "status=empty")
    return payload
