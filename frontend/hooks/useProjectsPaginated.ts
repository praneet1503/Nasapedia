import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchProjects, FetchProjectsParams } from '../lib/api'
import { PaginatedResponse, Project } from '../lib/types'

type UseProjectsPaginatedProps = FetchProjectsParams

export function useProjectsPaginated(params: UseProjectsPaginatedProps) {
  const queryKey = ['projects', params.page, params]

  return useQuery<PaginatedResponse<Project>, Error>({
    queryKey,
    queryFn: () => fetchProjects(params),
    placeholderData: keepPreviousData, 
    staleTime: 5 * 60 * 1000, 
  })
}
