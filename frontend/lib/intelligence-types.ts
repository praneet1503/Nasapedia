// ── Launch Intelligence Types ────────────────────────────────
// Mirrors backend schemas for the Global Launch Intelligence system

export type DailyLaunchPoint = {
  date: string
  launches: number
}

export type LaunchVelocityData = {
  launches_7d: number
  launches_30d: number
  growth_rate_percent: number
  success_ratio: number
  successes_of_last_50: number
  total_last_50: number
  surge_detected: boolean
  phase: string
  upcoming_7d: number
  upcoming_30d: number
  daily_timeline: DailyLaunchPoint[]
}

export type AgencyEntry = {
  name: string
  total_launches: number
  successes: number
  success_rate: number
  type: string
  country: string
}

export type AgencyDominanceData = {
  period_days: number
  total_launches: number
  top_5: AgencyEntry[]
  full_leaderboard: AgencyEntry[]
  state_launches: number
  private_launches: number
  state_share_percent: number
  private_share_percent: number
}

export type OrbitalBucket = {
  count: number
  percent: number
}

export type OrbitalIntelligenceData = {
  distribution: Record<string, OrbitalBucket>
  usage_split: Record<string, OrbitalBucket>
  telecom_expansion_flag: boolean
  geo_launches_30d: number
  total_analyzed: number
}

export type MissionCategory = {
  name: string
  total: number
  percent: number
  recent_30d: number
  recent_percent: number
}

export type MissionClassificationData = {
  categories: MissionCategory[]
  military_escalation_flag: boolean
  military_percent_30d: number
  emerging_categories: string[]
  total_classified: number
}

export type AstronautInfo = {
  name: string
  agency: string
  nationality: string
  flights_count: number
  profile_image?: string | null
}

export type CrewedLaunch = {
  name: string
  net?: string | null
  provider: string
  status: string
  pad: string
  mission: string
}

export type AgencyBreakdown = {
  agency: string
  count: number
}

export type AstronautActivityData = {
  total_active: number
  agency_breakdown: AgencyBreakdown[]
  astronauts: AstronautInfo[]
  upcoming_crewed_missions: CrewedLaunch[]
  human_activity_index: number
}

export type DockedVehicle = {
  name: string
  docking_date?: string | null
  departure_date?: string | null
}

export type StationInfo = {
  name: string
  status: string
  orbit: string
  founded?: string | null
  owners: string[]
  docked_vehicles: DockedVehicle[]
  docked_count: number
  image_url?: string | null
}

export type StationTrafficData = {
  active_stations: StationInfo[]
  all_stations: StationInfo[]
  total_stations: number
  total_docked_vehicles: number
  traffic_density_index: number
}

export type SiteEntry = {
  name: string
  country: string
  latitude?: number | null
  longitude?: number | null
  total_launches: number
}

export type CountryEntry = {
  country: string
  launches: number
}

export type RegionalSpike = {
  country: string
  recent: number
  previous: number
}

export type GeopoliticalData = {
  country_leaderboard: CountryEntry[]
  site_leaderboard: SiteEntry[]
  regional_spikes: RegionalSpike[]
  total_countries: number
  total_sites: number
}

export type IntelligenceIndices = {
  space_activity_index: number
  orbital_expansion_index: number
  human_spaceflight_index: number
  military_utilization_index: number
  commercial_expansion_index: number
  surge_detected: boolean
  telecom_expansion: boolean
  military_escalation: boolean
  phase: string
}

export type FullDashboardData = {
  velocity: LaunchVelocityData
  agencies: AgencyDominanceData
  orbital: OrbitalIntelligenceData
  missions: MissionClassificationData
  astronauts: AstronautActivityData
  stations: StationTrafficData
  geopolitics: GeopoliticalData
  indices: IntelligenceIndices
}
