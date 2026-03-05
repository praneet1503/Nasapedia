import { useQuery } from '@tanstack/react-query'

import { fetchSpaceDevsValidation } from '../lib/api'
import type { GlobalLaunchIntelligenceResponse } from '../lib/types'

type UseSpaceDevsValidationParams = {
  mode: 'token' | 'anon'
  includeProbe: boolean
  samples: number
}

export function useSpaceDevsValidation(params: UseSpaceDevsValidationParams) {
  return useQuery<GlobalLaunchIntelligenceResponse, Error>({
    queryKey: ['global-launch-intelligence', params.mode, params.includeProbe, params.samples],
    queryFn: () =>
      fetchSpaceDevsValidation({
        mode: params.mode,
        includeProbe: params.includeProbe,
        samples: params.samples,
      }),
    staleTime: 5 * 60 * 1000,
  })
}

