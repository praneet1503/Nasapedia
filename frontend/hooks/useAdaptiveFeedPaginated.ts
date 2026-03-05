import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchAdaptiveFeed } from '../lib/api'
import type { PaginatedResponse, Project } from '../lib/types'

export function useAdaptiveFeedPaginated(page: number, visitorUuid: string, limit = 20) {
  return useQuery<PaginatedResponse<Project>, Error>({
    queryKey: ['adaptive-feed', page, visitorUuid, limit],
    queryFn: () => fetchAdaptiveFeed({ page, visitorUuid, limit }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(visitorUuid),
  })
}

