from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID

class ProjectSearchParams(BaseModel):
    q: Optional[str] = None
    trl_min: Optional[int] = None
    trl_max: Optional[int] = None
    organization: Optional[str] = None
    technology_area: Optional[str] = None
    limit: int = 10
    offset: int = 0
    order: str = "title_asc"
    include_empty_descriptions: bool = False

class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    trl: Optional[int] = None
    organization: Optional[str] = None
    technology_area: Optional[str] = None
    last_updated: datetime
    popularity_score: float = 0.0


class ProjectFeedOut(ProjectOut):
    popularity_score: float = 0.0


class ProjectClickIn(BaseModel):
    visitor_uuid: UUID


class FeedParams(BaseModel):
    page: int = 1
    include_empty_descriptions: bool = False

class ErrorResponse(BaseModel):
    error: str


class IssLocationOut(BaseModel):
    latitude: float
    longitude: float
    velocity: float
    visibility: str
    timestamp: int
    altitude: Optional[float] = None


SpaceDevsErrorType = Literal["INVALID_KEY", "RATE_LIMIT", "NETWORK", "UNKNOWN"]


class SpaceDevsValidationResult(BaseModel):
    valid: bool
    statusCode: int
    rateLimited: bool
    quotaRemaining: Optional[int] = None
    errorType: Optional[SpaceDevsErrorType] = None
    rawResponse: Optional[Dict[str, Any]] = None


class SpaceDevsLatencySample(BaseModel):
    sample: int
    latencyMs: int
    statusCode: int
    error: Optional[str] = None


class SpaceDevsEndpointLatency(BaseModel):
    endpoint: str
    samples: int
    averageResponseTimeMs: Optional[int] = None
    latencies: List[SpaceDevsLatencySample]


class SpaceDevsLatencyProbe(BaseModel):
    primary: SpaceDevsEndpointLatency
    secondary: SpaceDevsEndpointLatency
    fasterEndpoint: Optional[str] = None


class GlobalLaunchIntelligenceResponse(BaseModel):
    validation: SpaceDevsValidationResult
    latencyProbe: Optional[SpaceDevsLatencyProbe] = None


# ── Launch Intelligence Schemas ──────────────────────────────

class LaunchVelocityResponse(BaseModel):
    launches_7d: int = 0
    launches_30d: int = 0
    growth_rate_percent: float = 0.0
    success_ratio: float = 0.0
    successes_of_last_50: int = 0
    total_last_50: int = 0
    surge_detected: bool = False
    phase: str = "NOMINAL"
    upcoming_7d: int = 0
    upcoming_30d: int = 0
    daily_timeline: List[Dict[str, Any]] = []


class AgencyEntry(BaseModel):
    name: str
    total_launches: int = 0
    successes: int = 0
    success_rate: float = 0.0
    type: str = "Unknown"
    country: str = "Unknown"


class AgencyDominanceResponse(BaseModel):
    period_days: int = 90
    total_launches: int = 0
    top_5: List[AgencyEntry] = []
    full_leaderboard: List[AgencyEntry] = []
    state_launches: int = 0
    private_launches: int = 0
    state_share_percent: float = 0.0
    private_share_percent: float = 0.0


class OrbitalBucket(BaseModel):
    count: int = 0
    percent: float = 0.0


class OrbitalIntelligenceResponse(BaseModel):
    distribution: Dict[str, OrbitalBucket] = {}
    usage_split: Dict[str, OrbitalBucket] = {}
    telecom_expansion_flag: bool = False
    geo_launches_30d: int = 0
    total_analyzed: int = 0


class MissionCategory(BaseModel):
    name: str
    total: int = 0
    percent: float = 0.0
    recent_30d: int = 0
    recent_percent: float = 0.0


class MissionClassificationResponse(BaseModel):
    categories: List[MissionCategory] = []
    military_escalation_flag: bool = False
    military_percent_30d: float = 0.0
    emerging_categories: List[str] = []
    total_classified: int = 0


class AstronautInfo(BaseModel):
    name: str = "Unknown"
    agency: str = "Unknown"
    nationality: str = "Unknown"
    flights_count: int = 0
    profile_image: Optional[str] = None


class CrewedLaunch(BaseModel):
    name: str = "Unknown"
    net: Optional[str] = None
    provider: str = "Unknown"
    status: str = "Unknown"
    pad: str = "Unknown"
    mission: str = "Unknown"


class AgencyBreakdownEntry(BaseModel):
    agency: str
    count: int = 0


class AstronautActivityResponse(BaseModel):
    total_active: int = 0
    agency_breakdown: List[AgencyBreakdownEntry] = []
    astronauts: List[AstronautInfo] = []
    upcoming_crewed_missions: List[CrewedLaunch] = []
    human_activity_index: int = 0


class DockedVehicle(BaseModel):
    name: str = "Unknown"
    docking_date: Optional[str] = None
    departure_date: Optional[str] = None


class StationInfo(BaseModel):
    name: str = "Unknown"
    status: str = "Unknown"
    orbit: str = "Unknown"
    founded: Optional[str] = None
    owners: List[str] = []
    docked_vehicles: List[DockedVehicle] = []
    docked_count: int = 0
    image_url: Optional[str] = None


class StationTrafficResponse(BaseModel):
    active_stations: List[StationInfo] = []
    all_stations: List[StationInfo] = []
    total_stations: int = 0
    total_docked_vehicles: int = 0
    traffic_density_index: int = 0


class SiteEntry(BaseModel):
    name: str
    country: str = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_launches: int = 0


class CountryEntry(BaseModel):
    country: str
    launches: int = 0


class RegionalSpike(BaseModel):
    country: str
    recent: int = 0
    previous: int = 0


class GeopoliticalResponse(BaseModel):
    country_leaderboard: List[CountryEntry] = []
    site_leaderboard: List[SiteEntry] = []
    regional_spikes: List[RegionalSpike] = []
    total_countries: int = 0
    total_sites: int = 0


class IntelligenceIndicesResponse(BaseModel):
    space_activity_index: float = 0.0
    orbital_expansion_index: float = 0.0
    human_spaceflight_index: float = 0.0
    military_utilization_index: float = 0.0
    commercial_expansion_index: float = 0.0
    surge_detected: bool = False
    telecom_expansion: bool = False
    military_escalation: bool = False
    phase: str = "NOMINAL"


# ── Aurora Schemas ───────────────────────────────────────────

class AuroraBand(BaseModel):
    equator_edge: List[List[float]] = Field(default_factory=list)
    pole_edge: List[List[float]] = Field(default_factory=list)


class SolarWindOut(BaseModel):
    observed_at: Optional[str] = None
    density_cm3: Optional[float] = None
    speed_km_s: Optional[float] = None
    speed_10m_avg_km_s: Optional[float] = None
    density_10m_avg_cm3: Optional[float] = None
    source_status: Literal["ok", "stale", "error"] = "ok"
    stale: bool = False


class AuroraOvalResponse(BaseModel):
    updated_at: Optional[str] = None
    forecast_at: Optional[str] = None
    threshold: float = 3.0
    north_band: AuroraBand = Field(default_factory=AuroraBand)
    south_band: AuroraBand = Field(default_factory=AuroraBand)
    north_peak: float = 0.0
    south_peak: float = 0.0
    source_status: Literal["ok", "stale", "error"] = "ok"
    stale: bool = False


class KpPoint(BaseModel):
    time_tag: str
    kp: float


class AuroraKpResponse(BaseModel):
    current_kp: float = 0.0
    observed_at: Optional[str] = None
    recent: List[KpPoint] = Field(default_factory=list)
    solar_wind: SolarWindOut = Field(default_factory=SolarWindOut)
    source_status: Literal["ok", "stale", "error"] = "ok"
    stale: bool = False


# ── Spaceflight News Schemas ─────────────────────────────────

class SpaceContentParams(BaseModel):
    limit: int = 20
    offset: int = 0

    @property
    def safe_limit(self) -> int:
        return max(1, min(self.limit, 20))

    @property
    def safe_offset(self) -> int:
        return max(0, self.offset)


class SpaceContentItemOut(BaseModel):
    id: int
    title: str
    summary: str = ""
    image_url: str = ""
    news_site: str = ""
    published_at: str = ""
    url: str = ""


class SpaceContentResponse(BaseModel):
    items: List[SpaceContentItemOut] = []
    next: Optional[str] = None
    previous: Optional[str] = None
