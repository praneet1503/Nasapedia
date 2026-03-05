from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.http_utils import build_response, json_error
from app.schemas import GlobalLaunchIntelligenceResponse
from app.services.spacedevs import run_secondary_latency_probe, validate_spacedevs_api_key
from app.services.launch_intelligence import (
    compute_agency_dominance,
    compute_astronaut_activity,
    compute_geopolitical_sites,
    compute_intelligence_indices,
    compute_launch_velocity,
    compute_mission_classification,
    compute_orbital_intelligence,
    compute_station_traffic,
    fetch_all_launch_data,
    fetch_astronauts,
    fetch_space_stations,
)

router = APIRouter()
PREFIX = "/global-launch-intelligence"


@router.get(f"{PREFIX}/validate")
async def validate(
    request: Request,
    mode: Literal["token", "anon"] = Query(default="token"),
    include_probe: bool = Query(default=False),
    samples: int = Query(default=3, ge=1, le=5),
) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")

    try:
        validation = await validate_spacedevs_api_key(auth_mode=mode)

        payload = GlobalLaunchIntelligenceResponse(validation=validation)
        if include_probe:
            latency_probe = await run_secondary_latency_probe(auth_mode=mode, samples=samples)
            payload = GlobalLaunchIntelligenceResponse(validation=validation, latencyProbe=latency_probe)

        return build_response(payload.model_dump(mode="json"), request_id=request_id)
    except Exception:
        return json_error(500, "Space Devs validation failed", request_id=request_id)


# ── Launch Velocity ──────────────────────────────────────────

@router.get(f"{PREFIX}/velocity")
async def launch_velocity(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        result = compute_launch_velocity(data["upcoming"], data["previous"])
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Launch velocity computation failed: {e}", request_id=request_id)


# ── Agency Dominance ─────────────────────────────────────────

@router.get(f"{PREFIX}/agencies")
async def agency_dominance(
    request: Request,
    days: int = Query(default=90, ge=7, le=365),
) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        result = compute_agency_dominance(data["previous"], days=days)
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Agency dominance computation failed: {e}", request_id=request_id)


# ── Orbital Intelligence ────────────────────────────────────

@router.get(f"{PREFIX}/orbital")
async def orbital_intelligence(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        result = compute_orbital_intelligence(data["previous"], data["upcoming"])
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Orbital intelligence computation failed: {e}", request_id=request_id)


# ── Mission Classification ──────────────────────────────────

@router.get(f"{PREFIX}/missions")
async def mission_classification(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        result = compute_mission_classification(data["previous"], data["upcoming"])
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Mission classification failed: {e}", request_id=request_id)


# ── Astronaut Activity ──────────────────────────────────────

@router.get(f"{PREFIX}/astronauts")
async def astronaut_activity(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        astros = await fetch_astronauts(limit=100)
        result = compute_astronaut_activity(astros, data["upcoming"])
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Astronaut activity computation failed: {e}", request_id=request_id)


# ── Station Traffic ──────────────────────────────────────────

@router.get(f"{PREFIX}/stations")
async def station_traffic(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        stations = await fetch_space_stations()
        result = compute_station_traffic(stations)
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Station traffic computation failed: {e}", request_id=request_id)


# ── Geopolitical Sites ──────────────────────────────────────

@router.get(f"{PREFIX}/geopolitics")
async def geopolitical_sites(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        result = compute_geopolitical_sites(data["previous"], data["upcoming"])
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Geopolitical computation failed: {e}", request_id=request_id)


# ── Intelligence Indices (composite) ────────────────────────

@router.get(f"{PREFIX}/indices")
async def intelligence_indices(request: Request) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        astros = await fetch_astronauts(limit=100)
        stations = await fetch_space_stations()

        velocity = compute_launch_velocity(data["upcoming"], data["previous"])
        agency = compute_agency_dominance(data["previous"])
        orbital = compute_orbital_intelligence(data["previous"], data["upcoming"])
        missions = compute_mission_classification(data["previous"], data["upcoming"])
        astro_data = compute_astronaut_activity(astros, data["upcoming"])
        station_data = compute_station_traffic(stations)

        result = compute_intelligence_indices(
            velocity, agency, orbital, missions, astro_data, station_data
        )
        return build_response(result, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Intelligence indices computation failed: {e}", request_id=request_id)


# ── Full Dashboard (all modules in one call) ────────────────

@router.get(f"{PREFIX}/dashboard")
async def full_dashboard(
    request: Request,
    days: int = Query(default=90, ge=7, le=365),
) -> JSONResponse:
    """Return all intelligence modules in a single response for the dashboard hub."""
    request_id = request.headers.get("X-Request-Id")
    try:
        data = await fetch_all_launch_data()
        astros = await fetch_astronauts(limit=100)
        stations = await fetch_space_stations()

        velocity = compute_launch_velocity(data["upcoming"], data["previous"])
        agency = compute_agency_dominance(data["previous"], days=days)
        orbital = compute_orbital_intelligence(data["previous"], data["upcoming"])
        missions = compute_mission_classification(data["previous"], data["upcoming"])
        astro_data = compute_astronaut_activity(astros, data["upcoming"])
        station_data = compute_station_traffic(stations)
        geopolitics = compute_geopolitical_sites(data["previous"], data["upcoming"])
        indices = compute_intelligence_indices(
            velocity, agency, orbital, missions, astro_data, station_data
        )

        return build_response({
            "velocity": velocity,
            "agencies": agency,
            "orbital": orbital,
            "missions": missions,
            "astronauts": astro_data,
            "stations": station_data,
            "geopolitics": geopolitics,
            "indices": indices,
        }, request_id=request_id)
    except Exception as e:
        return json_error(500, f"Dashboard computation failed: {e}", request_id=request_id)
