// ── Launch Intelligence API Client ───────────────────────────
// Centralized fetch manager for all intelligence endpoints
// with built-in caching/error handling

import type {
  AgencyDominanceData,
  AstronautActivityData,
  FullDashboardData,
  GeopoliticalData,
  IntelligenceIndices,
  LaunchVelocityData,
  MissionClassificationData,
  OrbitalIntelligenceData,
  StationTrafficData,
} from './intelligence-types'

function getIntelligenceBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_GLOBAL_LAUNCH_INTELLIGENCE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (baseUrl) return `${baseUrl.replace(/\/+$/, '')}/global-launch-intelligence`

  throw new Error(
    'NEXT_PUBLIC_API_GLOBAL_LAUNCH_INTELLIGENCE_URL or NEXT_PUBLIC_API_URL is not defined'
  )
}

async function fetchIntelligence<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const base = getIntelligenceBaseUrl()
  const sp = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) sp.set(key, String(value))
    }
  }
  const qs = sp.toString()
  const url = `${base}${endpoint}${qs ? `?${qs}` : ''}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error(`Network error fetching ${endpoint}`)
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status} from ${endpoint}`)
  }

  return (await res.json()) as T
}

export function fetchLaunchVelocity(): Promise<LaunchVelocityData> {
  return fetchIntelligence<LaunchVelocityData>('/velocity')
}

export function fetchAgencyDominance(days: number = 90): Promise<AgencyDominanceData> {
  return fetchIntelligence<AgencyDominanceData>('/agencies', { days })
}

export function fetchOrbitalIntelligence(): Promise<OrbitalIntelligenceData> {
  return fetchIntelligence<OrbitalIntelligenceData>('/orbital')
}

export function fetchMissionClassification(): Promise<MissionClassificationData> {
  return fetchIntelligence<MissionClassificationData>('/missions')
}

export function fetchAstronautActivity(): Promise<AstronautActivityData> {
  return fetchIntelligence<AstronautActivityData>('/astronauts')
}

export function fetchStationTraffic(): Promise<StationTrafficData> {
  return fetchIntelligence<StationTrafficData>('/stations')
}

export function fetchGeopoliticalData(): Promise<GeopoliticalData> {
  return fetchIntelligence<GeopoliticalData>('/geopolitics')
}

export function fetchIntelligenceIndices(): Promise<IntelligenceIndices> {
  return fetchIntelligence<IntelligenceIndices>('/indices')
}

export function fetchFullDashboard(days: number = 90): Promise<FullDashboardData> {
  return fetchIntelligence<FullDashboardData>('/dashboard', { days })
}
