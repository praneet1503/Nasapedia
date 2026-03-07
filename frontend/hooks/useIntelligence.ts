'use client'

import { useQuery } from '@tanstack/react-query'

import {
  fetchLaunchVelocity,
  fetchAgencyDominance,
  fetchOrbitalIntelligence,
  fetchMissionClassification,
  fetchAstronautActivity,
  fetchStationTraffic,
  fetchGeopoliticalData,
  fetchIntelligenceIndices,
  fetchFullDashboard,
} from '../lib/intelligence-api'

import type {
  LaunchVelocityData,
  AgencyDominanceData,
  OrbitalIntelligenceData,
  MissionClassificationData,
  AstronautActivityData,
  StationTrafficData,
  GeopoliticalData,
  IntelligenceIndices,
  FullDashboardData,
} from '../lib/intelligence-types'

const STALE_TIME = 5 * 60 * 1000 
const INTEL_OPTS = { staleTime: STALE_TIME, retry: 2, refetchOnMount: true as const }

export function useLaunchVelocity() {
  return useQuery<LaunchVelocityData, Error>({
    queryKey: ['intelligence', 'velocity'],
    queryFn: fetchLaunchVelocity,
    ...INTEL_OPTS,
  })
}

export function useAgencyDominance(days: number = 90) {
  return useQuery<AgencyDominanceData, Error>({
    queryKey: ['intelligence', 'agencies', days],
    queryFn: () => fetchAgencyDominance(days),
    ...INTEL_OPTS,
  })
}

export function useOrbitalIntelligence() {
  return useQuery<OrbitalIntelligenceData, Error>({
    queryKey: ['intelligence', 'orbital'],
    queryFn: fetchOrbitalIntelligence,
    ...INTEL_OPTS,
  })
}

export function useMissionClassification() {
  return useQuery<MissionClassificationData, Error>({
    queryKey: ['intelligence', 'missions'],
    queryFn: fetchMissionClassification,
    ...INTEL_OPTS,
  })
}

export function useAstronautActivity() {
  return useQuery<AstronautActivityData, Error>({
    queryKey: ['intelligence', 'astronauts'],
    queryFn: fetchAstronautActivity,
    ...INTEL_OPTS,
  })
}

export function useStationTraffic() {
  return useQuery<StationTrafficData, Error>({
    queryKey: ['intelligence', 'stations'],
    queryFn: fetchStationTraffic,
    ...INTEL_OPTS,
  })
}

export function useGeopoliticalData() {
  return useQuery<GeopoliticalData, Error>({
    queryKey: ['intelligence', 'geopolitics'],
    queryFn: fetchGeopoliticalData,
    ...INTEL_OPTS,
  })
}

export function useIntelligenceIndices() {
  return useQuery<IntelligenceIndices, Error>({
    queryKey: ['intelligence', 'indices'],
    queryFn: fetchIntelligenceIndices,
    ...INTEL_OPTS,
  })
}

export function useFullDashboard(days: number = 90) {
  return useQuery<FullDashboardData, Error>({
    queryKey: ['intelligence', 'dashboard', days],
    queryFn: () => fetchFullDashboard(days),
    ...INTEL_OPTS,
  })
}
