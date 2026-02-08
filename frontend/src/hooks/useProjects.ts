import { useQuery } from '@tanstack/react-query'
import type { Project } from '../../lib/types'

export const projectsQueryKey = ['projects'] as const

async function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  const res = await fetch('/api/projects', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch projects (${res.status})`)
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data as Project[]
}

export function useProjects() {
  const query = useQuery({
    queryKey: projectsQueryKey,
    queryFn: ({ signal }) => fetchProjects(signal),
  })

  return {
    ...query,
    // Default to an empty list so UIs can render safely while cache hydrates.
    projects: query.data ?? [],
  }
}
