import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchProjects, FetchProjectsParams } from '../lib/api'
import { PaginatedResponse, Project } from '../lib/types'

type UseProjectsPaginatedProps = FetchProjectsParams

export function useProjectsPaginated(params: UseProjectsPaginatedProps) {
  // We include all filter params in the query key to ensure refetching when they change
  const queryKey = ['projects', params.page, params]

  return useQuery<PaginatedResponse<Project>, Error>({
    queryKey,
    queryFn: () => fetchProjects(params),
    placeholderData: keepPreviousData, // Keep showing previous page data while new page loads
    staleTime: 5 * 60 * 1000, // Cache pages for 5 minutes
  })
}
