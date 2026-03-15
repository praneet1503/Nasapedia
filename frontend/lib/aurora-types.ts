export type AuroraBand = {
  equator_edge: [number, number][]
  pole_edge: [number, number][]
}

export type AuroraOvalResponse = {
  updated_at: string | null
  forecast_at: string | null
  threshold: number
  north_band: AuroraBand
  south_band: AuroraBand
  north_peak: number
  south_peak: number
  source_status: 'ok' | 'stale' | 'error'
  stale: boolean
}

export type SolarWindOut = {
  observed_at: string | null
  density_cm3: number | null
  speed_km_s: number | null
  speed_10m_avg_km_s: number | null
  density_10m_avg_cm3: number | null
  source_status: 'ok' | 'stale' | 'error'
  stale: boolean
}

export type KpPoint = {
  time_tag: string
  kp: number
}

export type AuroraKpResponse = {
  current_kp: number
  observed_at: string | null
  recent: KpPoint[]
  solar_wind: SolarWindOut
  source_status: 'ok' | 'stale' | 'error'
  stale: boolean
}

export type AuroraSnapshot = {
  oval: AuroraOvalResponse
  kp: AuroraKpResponse
}
