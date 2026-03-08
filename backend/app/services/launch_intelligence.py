"""
Global Launch Intelligence Engine
─────────────────────────────────
Fetches Space Devs Launch Library v2 data and computes strategic
intelligence metrics: launch velocity, agency dominance, orbital
distribution, mission classification, astronaut activity, station
traffic, and geopolitical site analytics.

All heavy computation is cached server-side with a 5-minute TTL.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.http_utils import get_shared_async_client, log_timing, timing_start

# ── Space Devs API Configuration ──────────────────────────────

BASE_URL = "https://ll.thespacedevs.com/2.2.0/"
REQUEST_TIMEOUT = 12.0
MAX_RETRIES = 2
RETRY_DELAY = 0.5
CACHE_TTL = 300  # 5 minutes

# ── In-Memory Cache ───────────────────────────────────────────

_cache: Dict[str, Tuple[float, Any]] = {}


def _get_cached(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None


def _set_cached(key: str, value: Any, ttl: int = CACHE_TTL) -> None:
    _cache[key] = (time.time() + ttl, value)


# ── Generic Fetch Helper ─────────────────────────────────────

async def _fetch_spacedevs(
    endpoint: str,
    params: Optional[Dict[str, Any]] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Fetch from Space Devs API with caching, retry, and rate-limit safety.
    Paginates automatically to collect up to `limit` results.
    """
    started = timing_start()
    cache_key = f"sd:{endpoint}:{params}:{limit}"
    cached = _get_cached(cache_key)
    if cached is not None:
        log_timing("launch_intel.fetch_spacedevs", started, f"endpoint={endpoint} cache=hit")
        return cached

    api_key = (os.environ.get("SPACEDEVS_API_KEY") or "").strip()
    headers: Dict[str, str] = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Token {api_key}"

    all_results: List[Dict[str, Any]] = []
    request_count = 0
    url = f"{BASE_URL}{endpoint}"
    query = {**(params or {}), "limit": min(limit, 100), "offset": 0}

    for attempt in range(MAX_RETRIES + 1):
        try:
            client = get_shared_async_client("spacedevs", REQUEST_TIMEOUT)
            while len(all_results) < limit:
                req_started = timing_start()
                resp = await client.get(url, headers=headers, params=query)
                request_count += 1
                log_timing(
                    "launch_intel.spacedevs_http",
                    req_started,
                    f"endpoint={endpoint} attempt={attempt + 1} status={resp.status_code} offset={query.get('offset', 0)}",
                )

                if resp.status_code == 429:
                    # Rate limited — return whatever we have
                    break

                if 500 <= resp.status_code <= 599:
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                        break  # retry outer loop
                    return all_results  # give up

                if resp.status_code != 200:
                    break

                data = resp.json()
                results = data.get("results", [])
                all_results.extend(results)

                if not data.get("next") or len(all_results) >= limit:
                    break

                query["offset"] = len(all_results)
            else:
                break  # collected enough
            if resp.status_code == 200 or resp.status_code == 429:
                break  # don't retry on success or rate limit
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
                continue
            break

    trimmed = all_results[:limit]
    _set_cached(cache_key, trimmed)
    log_timing(
        "launch_intel.fetch_spacedevs",
        started,
        f"endpoint={endpoint} cache=miss requests={request_count} results={len(trimmed)}",
    )
    return trimmed


# ── Data Fetchers ─────────────────────────────────────────────

async def fetch_upcoming_launches(limit: int = 100) -> List[Dict]:
    return await _fetch_spacedevs("launch/upcoming/", limit=limit)


async def fetch_previous_launches(limit: int = 100) -> List[Dict]:
    return await _fetch_spacedevs("launch/previous/", limit=limit)


async def fetch_astronauts(limit: int = 100) -> List[Dict]:
    return await _fetch_spacedevs("astronaut/", params={"status": 1}, limit=limit)


async def fetch_space_stations() -> List[Dict]:
    return await _fetch_spacedevs("spacestation/", limit=20)


async def fetch_all_launch_data() -> Dict[str, List[Dict]]:
    """Parallel fetch of upcoming + previous launches."""
    started = timing_start()
    cache_key = "all_launch_data"
    cached = _get_cached(cache_key)
    if cached is not None:
        log_timing("launch_intel.fetch_all", started, "cache=hit")
        return cached

    upcoming, previous = await asyncio.gather(
        fetch_upcoming_launches(100),
        fetch_previous_launches(100),
    )
    result = {"upcoming": upcoming, "previous": previous}
    _set_cached(cache_key, result)
    log_timing(
        "launch_intel.fetch_all",
        started,
        f"cache=miss upcoming={len(upcoming)} previous={len(previous)}",
    )
    return result


# ── Helper Utilities ──────────────────────────────────────────

def _safe_str(obj: Any, *keys: str, default: str = "Unknown") -> str:
    """Safely traverse nested dicts."""
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return default
    return str(current) if current else default


def _safe_int(obj: Any, *keys: str, default: int = 0) -> int:
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return default
    try:
        return int(current) if current else default
    except (TypeError, ValueError):
        return default


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        # Space Devs uses ISO format
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _filter_by_date(launches: List[Dict], days: int) -> List[Dict]:
    cutoff = _days_ago(days)
    filtered = []
    for launch in launches:
        net = _parse_date(launch.get("net"))
        if net and net >= cutoff:
            filtered.append(launch)
    return filtered


# ── Intelligence Computations ─────────────────────────────────

def compute_launch_velocity(
    upcoming: List[Dict], previous: List[Dict]
) -> Dict[str, Any]:
    """
    Launch Velocity Engine:
    - launches per 7/30 days
    - growth rate vs previous month
    - success ratio (last 50)
    - surge detection
    """
    now = datetime.now(timezone.utc)

    # Previous launches in time windows
    prev_7d = [l for l in previous if _parse_date(l.get("net")) and _parse_date(l.get("net")) >= now - timedelta(days=7)]
    prev_30d = [l for l in previous if _parse_date(l.get("net")) and _parse_date(l.get("net")) >= now - timedelta(days=30)]
    prev_60d = [l for l in previous if _parse_date(l.get("net")) and _parse_date(l.get("net")) >= now - timedelta(days=60)]

    launches_7d = len(prev_7d)
    launches_30d = len(prev_30d)

    # Previous month for comparison (30-60 days ago)
    prev_month = len(prev_60d) - len(prev_30d)
    growth_rate = 0.0
    if prev_month > 0:
        growth_rate = round(((launches_30d - prev_month) / prev_month) * 100, 1)

    # Success ratio from last 50 previous launches
    last_50 = previous[:50]
    successes = sum(
        1 for l in last_50
        if _safe_str(l, "status", "abbrev").lower() == "success"
    )
    success_ratio = round(successes / max(len(last_50), 1) * 100, 1)

    # Monthly average (from 60-day window)
    monthly_avg = len(prev_60d) / 2 if prev_60d else launches_30d
    surge_flag = launches_30d > monthly_avg * 1.2 if monthly_avg > 0 else False

    # Upcoming launches in next 7/30 days
    upcoming_7d = [l for l in upcoming if _parse_date(l.get("net")) and _parse_date(l.get("net")) <= now + timedelta(days=7)]
    upcoming_30d = [l for l in upcoming if _parse_date(l.get("net")) and _parse_date(l.get("net")) <= now + timedelta(days=30)]

    # Daily launch timeline (last 30 days)
    daily_timeline: List[Dict[str, Any]] = []
    for i in range(29, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        count = sum(
            1 for l in previous
            if _parse_date(l.get("net")) and _parse_date(l.get("net")).strftime("%Y-%m-%d") == day_str
        )
        daily_timeline.append({"date": day_str, "launches": count})

    return {
        "launches_7d": launches_7d,
        "launches_30d": launches_30d,
        "growth_rate_percent": growth_rate,
        "success_ratio": success_ratio,
        "successes_of_last_50": successes,
        "total_last_50": len(last_50),
        "surge_detected": surge_flag,
        "phase": "HIGH ACTIVITY" if surge_flag else "NOMINAL",
        "upcoming_7d": len(upcoming_7d),
        "upcoming_30d": len(upcoming_30d),
        "daily_timeline": daily_timeline,
    }


def compute_agency_dominance(previous: List[Dict], days: int = 90) -> Dict[str, Any]:
    """
    Agency Dominance Ranking:
    - total launches per provider (last N days)
    - success rate per provider
    - state vs private breakdown
    - top 5 leaderboard
    """
    filtered = _filter_by_date(previous, days)

    provider_stats: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"total": 0, "successes": 0, "type": "Unknown", "country": "Unknown"}
    )

    for launch in filtered:
        lsp = launch.get("launch_service_provider") or {}
        name = lsp.get("name", "Unknown")
        lsp_type = lsp.get("type", "Unknown")
        country = lsp.get("country_code", "Unknown")
        status = _safe_str(launch, "status", "abbrev").lower()

        provider_stats[name]["total"] += 1
        provider_stats[name]["type"] = lsp_type
        provider_stats[name]["country"] = country
        if status == "success":
            provider_stats[name]["successes"] += 1

    # Build leaderboard
    leaderboard = []
    for name, stats in provider_stats.items():
        success_rate = round(stats["successes"] / max(stats["total"], 1) * 100, 1)
        leaderboard.append({
            "name": name,
            "total_launches": stats["total"],
            "successes": stats["successes"],
            "success_rate": success_rate,
            "type": stats["type"],
            "country": stats["country"],
        })

    leaderboard.sort(key=lambda x: x["total_launches"], reverse=True)
    top_5 = leaderboard[:5]

    # State vs Private
    state_launches = sum(s["total"] for s in provider_stats.values() if s["type"] == "Government")
    private_launches = sum(s["total"] for s in provider_stats.values() if s["type"] != "Government")
    total = state_launches + private_launches

    return {
        "period_days": days,
        "total_launches": len(filtered),
        "top_5": top_5,
        "full_leaderboard": leaderboard[:20],
        "state_launches": state_launches,
        "private_launches": private_launches,
        "state_share_percent": round(state_launches / max(total, 1) * 100, 1),
        "private_share_percent": round(private_launches / max(total, 1) * 100, 1),
    }


def compute_orbital_intelligence(previous: List[Dict], upcoming: List[Dict]) -> Dict[str, Any]:
    """
    Orbital Intelligence:
    - LEO / MEO / GEO / deep space distribution
    - military vs civilian vs commercial
    - telecom expansion detection
    """
    all_launches = previous + upcoming

    orbit_counts: Counter = Counter()
    orbit_category: Counter = Counter()
    mission_types_by_orbit: Dict[str, Counter] = defaultdict(Counter)

    for launch in all_launches:
        mission = launch.get("mission") or {}
        orbit = mission.get("orbit") or {}
        orbit_abbrev = orbit.get("abbrev", "UNK")
        orbit_name = orbit.get("name", "Unknown")
        mission_type = mission.get("type", "Unknown")

        # Classify orbit
        if orbit_abbrev in ("LEO", "SSO", "PO", "ISS"):
            orbit_class = "LEO"
        elif orbit_abbrev in ("MEO",):
            orbit_class = "MEO"
        elif orbit_abbrev in ("GEO", "GTO", "GSO"):
            orbit_class = "GEO"
        elif orbit_abbrev in ("TLI", "LO", "Lunar", "HEO", "HCO", "SO", "Mars", "L1", "L2"):
            orbit_class = "Deep Space"
        else:
            orbit_class = "Other"

        orbit_counts[orbit_class] += 1
        mission_types_by_orbit[orbit_class][mission_type] += 1

        # Classify usage
        mission_lower = (mission_type or "").lower()
        if any(k in mission_lower for k in ("military", "defense", "reconnaissance")):
            orbit_category["Military"] += 1
        elif any(k in mission_lower for k in ("communications", "navigation")):
            orbit_category["Commercial"] += 1
        else:
            orbit_category["Civilian"] += 1

    total = sum(orbit_counts.values()) or 1
    distribution = {k: {"count": v, "percent": round(v / total * 100, 1)} for k, v in orbit_counts.items()}

    # GEO spike detection
    geo_30d = sum(1 for l in _filter_by_date(previous, 30)
                  if _safe_str(l, "mission", "orbit", "abbrev") in ("GEO", "GTO", "GSO"))
    geo_60d = sum(1 for l in _filter_by_date(previous, 60)
                  if _safe_str(l, "mission", "orbit", "abbrev") in ("GEO", "GTO", "GSO"))
    geo_prev_month = geo_60d - geo_30d
    telecom_expansion = geo_30d > geo_prev_month * 1.3 if geo_prev_month > 0 else False

    cat_total = sum(orbit_category.values()) or 1
    usage_split = {k: {"count": v, "percent": round(v / cat_total * 100, 1)} for k, v in orbit_category.items()}

    return {
        "distribution": distribution,
        "usage_split": usage_split,
        "telecom_expansion_flag": telecom_expansion,
        "geo_launches_30d": geo_30d,
        "total_analyzed": sum(orbit_counts.values()),
    }


def compute_mission_classification(previous: List[Dict], upcoming: List[Dict]) -> Dict[str, Any]:
    """
    Mission Classification Intelligence:
    - category distribution
    - trend detection
    - strategic escalation flags
    """
    # 30-day window for current trend
    recent = _filter_by_date(previous, 30)
    all_missions = previous + upcoming

    category_counts: Counter = Counter()
    recent_category: Counter = Counter()

    for launch in all_missions:
        mission = launch.get("mission") or {}
        mission_type = mission.get("type", "Unknown")
        if not mission_type:
            mission_type = _safe_str(launch, "mission", "type", default="Unknown")
        category_counts[mission_type] += 1

    for launch in recent:
        mission = launch.get("mission") or {}
        mission_type = mission.get("type", "Unknown")
        if not mission_type:
            mission_type = _safe_str(launch, "mission", "type", default="Unknown")
        recent_category[mission_type] += 1

    total = sum(category_counts.values()) or 1
    recent_total = sum(recent_category.values()) or 1

    categories = []
    for cat, count in category_counts.most_common(15):
        recent_count = recent_category.get(cat, 0)
        categories.append({
            "name": cat,
            "total": count,
            "percent": round(count / total * 100, 1),
            "recent_30d": recent_count,
            "recent_percent": round(recent_count / recent_total * 100, 1),
        })

    # Military flag
    military_recent = recent_category.get("Government/Top Secret", 0) + \
                      recent_category.get("Military", 0) + \
                      recent_category.get("Defense", 0) + \
                      recent_category.get("National Security", 0)
    military_escalation = military_recent / recent_total > 0.15 if recent_total > 0 else False

    # Emerging category: any category with >50% more launches in 30d vs average
    emerging = []
    days_previous = max(len(previous) / 1, 1) # Fallback if time units are weird
    for cat in categories:
        # Simple heuristic: if recent 30d is more than 40% of their total history (which covers 100+ launches, usually ~6-12 months)
        if cat["total"] > 5 and cat["recent_30d"] > (cat["total"] * 0.4):
            emerging.append(cat["name"])

    return {
        "categories": categories,
        "military_escalation_flag": military_escalation,
        "military_percent_30d": round(military_recent / max(recent_total, 1) * 100, 1),
        "emerging_categories": emerging,
        "total_classified": total,
    }


def compute_astronaut_activity(
    astronauts: List[Dict], upcoming: List[Dict]
) -> Dict[str, Any]:
    """
    Astronaut & Crew Intelligence:
    - Active astronaut count
    - Agency representation
    - Upcoming crewed missions
    """
    agency_count: Counter = Counter()
    active_astronauts = []

    for astro in astronauts:
        # Some are in training status but fetch_astronauts filters by status 1 (Active)
        # However, the nested agency object can be None or missing name
        agency = _safe_str(astro, "agency", "name", default="Independent / Other")
        agency_count[agency] += 1
        active_astronauts.append({
            "name": astro.get("name", "Unknown"),
            "agency": agency,
            "nationality": astro.get("nationality", "Unknown"),
            "flights_count": astro.get("flights_count", 0),
            "profile_image": astro.get("profile_image"),
        })

    # Crewed upcoming missions
    crewed_launches = []
    for launch in upcoming:
        name = (launch.get("name") or "").lower()
        mission = launch.get("mission") or {}
        mission_type = (mission.get("type") or "").lower()
        mission_desc = (mission.get("description") or "").lower()

        # Robust human spaceflight detection
        is_crewed = any(k in mission_type for k in ("human", "crew", "spaceflight")) or \
                     any(k in mission_desc for k in ("crew", "astronaut", "passengers")) or \
                     any(k in name for k in ("crew-", "axiom", "polaris", "soyuz ms-"))

        if is_crewed:
            crewed_launches.append({
                "name": launch.get("name", "Unknown"),
                "net": launch.get("net"),
                "provider": _safe_str(launch, "launch_service_provider", "name"),
                "status": _safe_str(launch, "status", "name"),
                "pad": _safe_str(launch, "pad", "name"),
                "mission": mission.get("name", "Unknown"),
            })

    # Sort astronauts by flight count to show most experienced first in roster
    active_astronauts.sort(key=lambda x: x["flights_count"], reverse=True)

    agency_breakdown = [{"agency": k, "count": v} for k, v in agency_count.most_common(10)]

    return {
        "total_active": len(active_astronauts),
        "agency_breakdown": agency_breakdown,
        "astronauts": active_astronauts[:100],  # Increase to 100
        "upcoming_crewed_missions": crewed_launches,
        "human_activity_index": min(len(crewed_launches) * 15 + len(active_astronauts), 100),
    }


def compute_station_traffic(stations: List[Dict]) -> Dict[str, Any]:
    """
    Space Station Traffic Monitor:
    - Active stations
    - Docked vehicles
    - Traffic density
    """
    station_data = []
    total_docked = 0

    for station in stations:
        status_raw = _safe_str(station, "status", "name", default="Active")
        # Handle LL2 names like "De-Orbited" or "Active"
        status = status_raw if status_raw else "Active"
        
        docked_vehicles = station.get("docked_vehicles") or []
        spacecraft_count = len(docked_vehicles)
        total_docked += spacecraft_count

        vehicles = []
        for dv in docked_vehicles:
            v_name = "Unknown Vehicle"
            if dv.get("spacecraft_flight") and dv["spacecraft_flight"].get("spacecraft"):
                v_name = dv["spacecraft_flight"]["spacecraft"].get("name", "Unknown")
            elif dv.get("flight_vehicle") and dv["flight_vehicle"].get("spacecraft"):
                v_name = dv["flight_vehicle"]["spacecraft"].get("name", "Unknown")
            elif dv.get("spacecraft"):
                v_name = dv["spacecraft"].get("name", "Unknown")

            vehicles.append({
                "name": v_name,
                "docking_date": dv.get("docking"),
                "departure_date": dv.get("departure"),
            })

        station_data.append({
            "name": station.get("name", "Unknown"),
            "status": status,
            "orbit": _safe_str(station, "orbit", default="Low Earth Orbit"),
            "founded": station.get("founded"),
            "owners": [_safe_str(o, "name") for o in (station.get("owners") or [])],
            "docked_vehicles": vehicles,
            "docked_count": spacecraft_count,
            "image_url": station.get("image_url"),
        })

    # Sort stations to put active ones at top (ISS, Tiangong usually)
    active_statuses = ("active", "de-orbited", "functional")
    station_data.sort(key=lambda s: s["status"].lower() in active_statuses, reverse=True)

    return {
        "active_stations": [s for s in station_data if s["status"].lower() in active_statuses],
        "all_stations": station_data,
        "total_stations": len(station_data),
        "total_docked_vehicles": total_docked,
        "traffic_density_index": min(total_docked * 12, 100),
    }


def compute_geopolitical_sites(previous: List[Dict], upcoming: List[Dict]) -> Dict[str, Any]:
    """
    Launch Site Geopolitical Map:
    - Launches by country
    - Launches by site
    - Regional activity spikes
    """
    all_launches = previous + upcoming

    country_counts: Counter = Counter()
    site_counts: Counter = Counter()
    site_details: Dict[str, Dict] = {}

    for launch in all_launches:
        pad = launch.get("pad") or {}
        location = pad.get("location") or {}
        country = location.get("country_code", "UNK")
        site_name = location.get("name", "Unknown")
        pad_name = pad.get("name", "Unknown")

        country_counts[country] += 1
        site_counts[site_name] += 1

        if site_name not in site_details:
            # coerce lat/long to float when possible; Space Devs returns numbers or strings
            raw_lat = pad.get("latitude")
            raw_lon = pad.get("longitude")
            def to_float(x):
                try:
                    return float(x) if x is not None else None
                except Exception:
                    return None
            site_details[site_name] = {
                "name": site_name,
                "country": country,
                "latitude": to_float(raw_lat),
                "longitude": to_float(raw_lon),
                "total_launches": 0,
            }
        site_details[site_name]["total_launches"] += 1

    country_leaderboard = [{"country": k, "launches": v} for k, v in country_counts.most_common(20)]
    site_leaderboard = [site_details[k] for k, _ in site_counts.most_common(20)]

    # Regional spike detection (compare 30d vs 60d)
    recent = _filter_by_date(previous, 30)
    older = [l for l in previous if _parse_date(l.get("net")) and
             _days_ago(60) <= _parse_date(l.get("net")) < _days_ago(30)]

    recent_countries: Counter = Counter()
    older_countries: Counter = Counter()
    for l in recent:
        c = _safe_str(l, "pad", "location", "country_code")
        recent_countries[c] += 1
    for l in older:
        c = _safe_str(l, "pad", "location", "country_code")
        older_countries[c] += 1

    spikes = []
    for country, count in recent_countries.items():
        prev_count = older_countries.get(country, 0)
        if prev_count > 0 and count > prev_count * 1.5:
            spikes.append({"country": country, "recent": count, "previous": prev_count})

    return {
        "country_leaderboard": country_leaderboard,
        "site_leaderboard": site_leaderboard,
        "regional_spikes": spikes,
        "total_countries": len(country_counts),
        "total_sites": len(site_counts),
    }


def compute_intelligence_indices(
    velocity: Dict[str, Any],
    agency: Dict[str, Any],
    orbital: Dict[str, Any],
    missions: Dict[str, Any],
    astronauts: Dict[str, Any],
    stations: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Derived Intelligence Indicators:
    - Space Activity Index
    - Orbital Expansion Index
    - Human Spaceflight Index
    - Military Utilization Index
    - Commercial Expansion Index
    """
    # Space Activity Index: weighted composite (0-100)
    launch_score = min(velocity.get("launches_30d", 0) * 3, 40)
    success_score = velocity.get("success_ratio", 0) * 0.3
    crew_score = astronauts.get("human_activity_index", 0) * 0.3
    space_activity_index = round(min(launch_score + success_score + crew_score, 100), 1)

    # Orbital Expansion Index
    dist = orbital.get("distribution", {})
    leo = dist.get("LEO", {}).get("percent", 0)
    deep = dist.get("Deep Space", {}).get("percent", 0)
    orbital_expansion = round(min(deep * 5 + (100 - leo) * 0.5, 100), 1)

    # Human Spaceflight Index
    crewed = len(astronauts.get("upcoming_crewed_missions", []))
    active = astronauts.get("total_active", 0)
    human_index = round(min(crewed * 10 + active * 0.5, 100), 1)

    # Military Utilization Index
    mil_pct = missions.get("military_percent_30d", 0)
    military_index = round(min(mil_pct * 4, 100), 1)

    # Commercial Expansion Index
    private_pct = agency.get("private_share_percent", 0)
    commercial_index = round(min(private_pct * 1.2, 100), 1)

    return {
        "space_activity_index": space_activity_index,
        "orbital_expansion_index": orbital_expansion,
        "human_spaceflight_index": human_index,
        "military_utilization_index": military_index,
        "commercial_expansion_index": commercial_index,
        "surge_detected": velocity.get("surge_detected", False),
        "telecom_expansion": orbital.get("telecom_expansion_flag", False),
        "military_escalation": missions.get("military_escalation_flag", False),
        "phase": velocity.get("phase", "NOMINAL"),
    }
