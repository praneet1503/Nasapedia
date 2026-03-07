import type {
  ApiError,
  GlobalLaunchIntelligenceResponse,
  IssLocation,
  PaginatedResponse,
  Project,
} from './types'


const inFlightRequests = new Map<string, Promise<PaginatedResponse<Project>>>()


class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number
  private maxAge: number

  constructor(maxSize: number = 50, maxAge: number = 5 * 60 * 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.maxAge = maxAge
  }

  get(key: K): V | null {
    if (!this.cache.has(key)) return null

    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    this.cache.set(key, value)
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

interface CacheEntry {
  data: PaginatedResponse<Project>
  expiry: number
  timestamp: number
}

const SEARCH_CACHE = new LRUCache<string, CacheEntry>(50, 5 * 60 * 1000)
const CACHE_STATS = { hits: 0, misses: 0 }
const CACHE_TTL_MS = 5 * 60 * 1000

if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    if (CACHE_STATS.hits + CACHE_STATS.misses > 10000) {
      CACHE_STATS.hits = Math.floor(CACHE_STATS.hits / 2)
      CACHE_STATS.misses = Math.floor(CACHE_STATS.misses / 2)
    }
  }, 60 * 1000)
}

export type FetchProjectsParams = {
  q?: string
  trl_min?: number
  trl_max?: number
  organization?: string
  technology_area?: string
  order?: string
  page?: number
  limit?: number
  search_type?: 'keyword' | 'semantic'
  include_empty_descriptions?: boolean
}

export type FetchFeedParams = {
  page?: number
  limit?: number
  visitorUuid: string
}

function getApiProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_PROJECTS_URL
  if (typeof window !== 'undefined') {
    console.debug('getApiProjectUrl:', { env: url, origin: window.location?.origin })
  } else {
    console.debug('getApiProjectUrl: server-side; env=', url)
  }

  if (!url) {
    throw new Error('NEXT_PUBLIC_API_PROJECTS_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
}

function getApiProjectIdUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_PROJECTS_ID_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_PROJECTS_ID_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
}

function getApiFeedUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_FEED_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_FEED_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
}

function getApiIssBaseUrl(): string {
  const issUrl = process.env.NEXT_PUBLIC_API_ISS_URL
  if (issUrl) {
    return issUrl.replace(/\/+$/, '')
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, '')
  }

  throw new Error('NEXT_PUBLIC_API_ISS_URL or NEXT_PUBLIC_API_URL is not defined in environment variables')
}

function getApiGlobalLaunchIntelligenceUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_GLOBAL_LAUNCH_INTELLIGENCE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (baseUrl) return `${baseUrl.replace(/\/+$/, '')}/global-launch-intelligence`

  throw new Error(
    'NEXT_PUBLIC_API_GLOBAL_LAUNCH_INTELLIGENCE_URL or NEXT_PUBLIC_API_URL is not defined in environment variables'
  )
}

export function getApiIssWsUrl(): string {
  const base = getApiIssBaseUrl()
  if (base.startsWith('https://')) return base.replace(/^https:/, 'wss:')
  if (base.startsWith('http://')) return base.replace(/^http:/, 'ws:')
  return `wss://${base}`
}

function getApiProjectClickUrl(projectId: number): string {
  const configured = process.env.NEXT_PUBLIC_API_PROJECT_CLICK_URL
  if (configured) {
    const normalized = configured.replace(/\/+$/, '')
    if (normalized.includes('{id}')) {
      return normalized.replace('{id}', String(projectId))
    }
    return `${normalized}?project_id=${projectId}`
  }

  const projectsBase = getApiProjectUrl()
  return `${projectsBase}/${projectId}/click`
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

function getCacheKey(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  const cacheableKeys = ['q', 'trl_min', 'trl_max', 'organization', 'technology_area', 'order', 'search_type', 'page', 'limit', 'include_empty_descriptions']
  for (const key of cacheableKeys) {
    const value = params[key]
    if (value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    sp.set(key, String(value))
  }
  return sp.toString()
}

function getCachedResult(cacheKey: string): PaginatedResponse<Project> | null {
  const entry = SEARCH_CACHE.get(cacheKey as never)
  if (!entry) {
    CACHE_STATS.misses++
    return null
  }
  if (entry.expiry < Date.now()) {
    SEARCH_CACHE.clear()
    CACHE_STATS.misses++
    return null
  }
  CACHE_STATS.hits++
  return entry.data
}

export function getCacheStats(): { hits: number; misses: number; hitRate: number } {
  const total = CACHE_STATS.hits + CACHE_STATS.misses
  return {
    hits: CACHE_STATS.hits,
    misses: CACHE_STATS.misses,
    hitRate: total > 0 ? CACHE_STATS.hits / total : 0,
  }
}

export async function fetchProjects(params: FetchProjectsParams): Promise<PaginatedResponse<Project>> {
  const baseUrl = getApiProjectUrl()

  const page = params.page && params.page > 0 ? params.page : 1
  const limit = params.limit ?? 10
  const offset = (page - 1) * limit


  const cacheKey = getCacheKey({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
    search_type: params.search_type,
    page: page,
    limit: limit,
  })

  const cached = getCachedResult(cacheKey)
  if (cached) {
    return cached
  }

  const url = `${baseUrl}${buildSearchParams({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
    search_type: params.search_type,
    include_empty_descriptions: params.include_empty_descriptions,
    limit: limit,
    offset: offset,
  })}`

  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!
  }

  const requestPromise = (async () => {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
    } catch (e) {
      inFlightRequests.delete(url)
      throw new Error('Network error while fetching projects')
    }

    if (res.status === 404) {
      inFlightRequests.delete(url)
      return { data: [], page, pageSize: limit, totalCount: 0, totalPages: 0 }
    }

    if (!res.ok) {
      inFlightRequests.delete(url)
      if (res.status >= 400 && res.status < 500) {
        return { data: [], page, pageSize: limit, totalCount: 0, totalPages: 0 }
      }
      throw new Error(`Unexpected error (${res.status}) while fetching projects`)
    }

    const json = (await res.json()) as unknown
    const result = json as PaginatedResponse<Project>

    SEARCH_CACHE.set(cacheKey as never, {
      data: result,
      expiry: Date.now() + CACHE_TTL_MS,
      timestamp: Date.now(),
    })

    inFlightRequests.delete(url)
    return result
  })()

  inFlightRequests.set(url, requestPromise)
  return requestPromise
}

export async function fetchProjectById(id: number): Promise<Project | null> {
  const baseUrl = getApiProjectIdUrl()
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

export async function fetchAdaptiveFeed(
  params: FetchFeedParams
): Promise<PaginatedResponse<Project>> {
  const baseUrl = getApiFeedUrl()
  const page = params.page && params.page > 0 ? params.page : 1
  const limit = params.limit ?? 20

  const url = `${baseUrl}${buildSearchParams({ page, limit })}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Visitor-UUID': params.visitorUuid,
      },
    })
  } catch (e) {
    throw new Error('Network error while fetching adaptive feed')
  }

  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) {
      return { data: [], page, pageSize: limit, totalCount: 0, totalPages: 0 }
    }
    throw new Error(`Unexpected error (${res.status}) while fetching feed`)
  }

  return (await res.json()) as PaginatedResponse<Project>
}

export async function recordProjectClick(projectId: number, visitorUuid: string): Promise<void> {
  const url = getApiProjectClickUrl(projectId)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Visitor-UUID': visitorUuid,
      },
      body: JSON.stringify({ visitor_uuid: visitorUuid }),
    })
  } catch (e) {
    return
  }

  if (!res.ok) {
    return
  }
}

export async function fetchIssLocation(): Promise<IssLocation> {
  const url = `${getApiIssBaseUrl()}/iss/location`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error('Network error while fetching ISS location')
  }

  const payload = (await res.json()) as IssLocation | ApiError

  if (!res.ok || 'error' in payload) {
    throw new Error('ISS data unavailable')
  }

  return payload
}

export type FetchSpaceDevsValidationParams = {
  mode?: 'token' | 'anon'
  includeProbe?: boolean
  samples?: number
}

export async function fetchSpaceDevsValidation(
  params: FetchSpaceDevsValidationParams = {}
): Promise<GlobalLaunchIntelligenceResponse> {
  const baseUrl = getApiGlobalLaunchIntelligenceUrl()
  const url = `${baseUrl}/validate${buildSearchParams({
    mode: params.mode ?? 'token',
    include_probe: params.includeProbe ? 'true' : 'false',
    samples: params.samples,
  })}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    throw new Error('Network error while validating Space Devs diagnostics')
  }

  if (!res.ok) {
    throw new Error(`Unexpected error (${res.status}) while validating Space Devs diagnostics`)
  }

  return (await res.json()) as GlobalLaunchIntelligenceResponse
}
