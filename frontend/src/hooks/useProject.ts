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

      const exactList = queryClient.getQueryData<Project[]>(projectsQueryKey)
      const foundInExact = exactList?.find((p) => p.id === id)
      if (foundInExact) return foundInExact

      const allProjectsQueries = queryClient.getQueriesData<Project[]>({ queryKey: projectsQueryKey })
      
      for (const [, projects] of allProjectsQueries) {
        if (Array.isArray(projects)) {
          const found = projects.find((p) => p.id === id)
          if (found) return found
        }
      }

      return undefined
    },

    staleTime: 30 * 1000, 
  })
}
