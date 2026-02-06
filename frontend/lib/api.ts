import type { Project } from './types'

export type FetchProjectsParams = {
  q?: string
  trl_min?: number
  trl_max?: number
  organization?: string
  technology_area?: string
  order?: string
  limit?: number
  offset?: number
}

export type FetchProjectsResult = {
  projects: Project[]
  total: number
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!baseUrl) return 'http://localhost:8000'
  return baseUrl.replace(/\/+$/, '')
}

function buildSearchParams(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    sp.set(key, String(value))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchProjects(params: FetchProjectsParams): Promise<FetchProjectsResult> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/api/projects${buildSearchParams({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  })}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error('Network error while fetching projects')
  }

  if (res.status === 404) return { projects: [], total: 0 }
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) return { projects: [], total: 0 }
    throw new Error(`Unexpected error (${res.status}) while fetching projects`)
  }

  const totalHeader = res.headers.get('X-Total-Count')
  const total = totalHeader ? Number(totalHeader) || 0 : 0

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return { projects: [], total }
  return { projects: data as Project[], total }
}

export async function fetchProjectById(id: number): Promise<Project | null> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/api/projects/${id}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error('Network error while fetching project')
  }

  if (res.status === 404) return null
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) return null
    throw new Error(`Unexpected error (${res.status}) while fetching project`)
  }

  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') return null
  return data as Project
}
