'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchAuroraKp, fetchAuroraOval } from '../lib/aurora-api'
import type { AuroraSnapshot } from '../lib/aurora-types'

const TWO_MINUTES = 2 * 60 * 1000

export function useAuroraData() {
  return useQuery<AuroraSnapshot, Error>({
    queryKey: ['aurora', 'snapshot'],
    queryFn: async () => {
      const [oval, kp] = await Promise.all([fetchAuroraOval(), fetchAuroraKp()])
      return { oval, kp }
    },
    staleTime: TWO_MINUTES,
    refetchInterval: TWO_MINUTES,
    retry: 2,
    refetchOnMount: true,
  })
}
