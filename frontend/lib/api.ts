import type { PaginatedResponse, Project } from './types'

export type FetchProjectsParams = {
  q?: string
  trl_min?: number
  trl_max?: number
  organization?: string
  technology_area?: string
  order?: string
  page?: number
  limit?: number
}

function getApiProjectUrl(): string {
  // Use explicit environment variable for the projects search endpoint
  const url = process.env.NEXT_PUBLIC_API_PROJECTS_URL
  // Debug: log the resolved env var and the page origin so we can verify what the client will fetch
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.debug('getApiProjectUrl:', { env: url, origin: window.location?.origin })
  } else {
    // eslint-disable-next-line no-console
    console.debug('getApiProjectUrl: server-side; env=', url)
  }

  if (!url) {
    throw new Error('NEXT_PUBLIC_API_PROJECTS_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
}

function getApiProjectIdUrl(): string {
  // Use explicit environment variable for the projects detail endpoint
  const url = process.env.NEXT_PUBLIC_API_PROJECTS_ID_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_PROJECTS_ID_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
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

export async function fetchProjects(params: FetchProjectsParams): Promise<PaginatedResponse<Project>> {
  const baseUrl = getApiProjectUrl()
  
  const page = params.page && params.page > 0 ? params.page : 1
  const limit = params.limit ?? 10
  const offset = (page - 1) * limit

  const url = `${baseUrl}${buildSearchParams({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
    limit: limit,
    offset: offset,
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

  // Handle empty or error states by returning a basic empty page
  if (res.status === 404) {
    return { data: [], page, pageSize: limit, totalCount: 0, totalPages: 0 }
  }
  
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) {
      return { data: [], page, pageSize: limit, totalCount: 0, totalPages: 0 }
    }
    throw new Error(`Unexpected error (${res.status}) while fetching projects`)
  }

  const json = (await res.json()) as unknown
  
  // Type guard or casting
  // We expect { data, page, pageSize, totalCount, totalPages }
  // depending on backend response.
  // We just updated backend to return this shape.
  return json as PaginatedResponse<Project>
}

export async function fetchProjectById(id: number): Promise<Project | null> {
  const baseUrl = getApiProjectIdUrl()
  // Append project_id as a query parameter because the Modal endpoint supports it via query_params
  const url = `${baseUrl}?project_id=${id}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error('Network error while fetching project details')
  }

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Unexpected error (${res.status}) while fetching project`)
  }

  const data = (await res.json()) as unknown
  return data as Project
}
