import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProjectById } from '../../lib/api'
import { projectsQueryKey } from './useProjects'
import type { Project } from '../../lib/types'

export function useProject(id: number | null) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      if (id === null) throw new Error('Invalid project ID')
      return fetchProjectById(id)
    },
    enabled: typeof id === 'number',
    initialData: () => {
      if (typeof id !== 'number') return undefined

      // 1. Check direct list cache (exact match)
      const exactList = queryClient.getQueryData<Project[]>(projectsQueryKey)
      const foundInExact = exactList?.find((p) => p.id === id)
      if (foundInExact) return foundInExact

      // 2. Check any cached query starting with ['projects'] (e.g. filtered searches)
      // getQueriesData returns [[queryKey, data], ...]
      const allProjectsQueries = queryClient.getQueriesData<Project[]>({ queryKey: projectsQueryKey })
      
      for (const [, projects] of allProjectsQueries) {
        if (Array.isArray(projects)) {
          const found = projects.find((p) => p.id === id)
          if (found) return found
        }
      }

      return undefined
    },
    // Consider the data "fresh" for 30s if loaded from cache, 
    // to avoid immediate refetch if the user just clicked it.
    staleTime: 30 * 1000, 
  })
}
