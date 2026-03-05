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

export function useLaunchVelocity() {
  return useQuery<LaunchVelocityData, Error>({
    queryKey: ['intelligence', 'velocity'],
    queryFn: fetchLaunchVelocity,
    staleTime: STALE_TIME,
  })
}

export function useAgencyDominance(days: number = 90) {
  return useQuery<AgencyDominanceData, Error>({
    queryKey: ['intelligence', 'agencies', days],
    queryFn: () => fetchAgencyDominance(days),
    staleTime: STALE_TIME,
  })
}

export function useOrbitalIntelligence() {
  return useQuery<OrbitalIntelligenceData, Error>({
    queryKey: ['intelligence', 'orbital'],
    queryFn: fetchOrbitalIntelligence,
    staleTime: STALE_TIME,
  })
}

export function useMissionClassification() {
  return useQuery<MissionClassificationData, Error>({
    queryKey: ['intelligence', 'missions'],
    queryFn: fetchMissionClassification,
    staleTime: STALE_TIME,
  })
}

export function useAstronautActivity() {
  return useQuery<AstronautActivityData, Error>({
    queryKey: ['intelligence', 'astronauts'],
    queryFn: fetchAstronautActivity,
    staleTime: STALE_TIME,
  })
}

export function useStationTraffic() {
  return useQuery<StationTrafficData, Error>({
    queryKey: ['intelligence', 'stations'],
    queryFn: fetchStationTraffic,
    staleTime: STALE_TIME,
  })
}

export function useGeopoliticalData() {
  return useQuery<GeopoliticalData, Error>({
    queryKey: ['intelligence', 'geopolitics'],
    queryFn: fetchGeopoliticalData,
    staleTime: STALE_TIME,
  })
}

export function useIntelligenceIndices() {
  return useQuery<IntelligenceIndices, Error>({
    queryKey: ['intelligence', 'indices'],
    queryFn: fetchIntelligenceIndices,
    staleTime: STALE_TIME,
  })
}

export function useFullDashboard(days: number = 90) {
  return useQuery<FullDashboardData, Error>({
    queryKey: ['intelligence', 'dashboard', days],
    queryFn: () => fetchFullDashboard(days),
    staleTime: STALE_TIME,
  })
}
