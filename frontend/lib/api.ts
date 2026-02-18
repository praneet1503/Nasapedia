import type { PaginatedResponse, Project } from './types'

// In-flight requests deduplication map (prevents duplicate API calls)
const inFlightRequests = new Map<string, Promise<PaginatedResponse<Project>>>()

// LRU Cache implementation with size limit to prevent unbounded memory growth
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
    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key) // Remove old entry
    }
    this.cache.set(key, value) // Add to end
    // Evict oldest (first) entry if size exceeded
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

// Cache instance with metadata for tracking metrics
interface CacheEntry {
  data: PaginatedResponse<Project>
  expiry: number
  timestamp: number
}

const SEARCH_CACHE = new LRUCache<string, CacheEntry>(50, 5 * 60 * 1000)
const CACHE_STATS = { hits: 0, misses: 0 }
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Cleanup expired cache entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    // LRU cache doesn't store expired items, but we can clean up metrics
    if (CACHE_STATS.hits + CACHE_STATS.misses > 10000) {
      CACHE_STATS.hits = Math.floor(CACHE_STATS.hits / 2)
      CACHE_STATS.misses = Math.floor(CACHE_STATS.misses / 2)
    }
  }, 60 * 1000) // Every minute
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
}

export type FetchFeedParams = {
  page?: number
  limit?: number
  visitorUuid: string
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

function getApiFeedUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_FEED_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_FEED_URL is not defined in environment variables')
  }
  return url.replace(/\/+$/, '')
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
  // Only cache key params, not pagination
  const cacheableKeys = ['q', 'trl_min', 'trl_max', 'organization', 'technology_area', 'order', 'search_type']
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

  // Check cache for this query (ignoring pagination)
  const cacheKey = getCacheKey({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
  })
  
  const cached = getCachedResult(cacheKey)
  if (cached) {
    // Return paginated results from cache
    const pageSize = cached.pageSize
    const startIdx = (page - 1) * pageSize
    const endIdx = startIdx + pageSize
    return {
      ...cached,
      data: cached.data.slice(startIdx, endIdx),
      page,
    }
  }

  const url = `${baseUrl}${buildSearchParams({
    q: params.q,
    trl_min: params.trl_min,
    trl_max: params.trl_max,
    organization: params.organization,
    technology_area: params.technology_area,
    order: params.order,
    search_type: params.search_type,
    limit: limit,
    offset: offset,
  })}`

  // Request deduplication: if same request is in-flight, reuse promise
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!
  }

  // Create promise for this request and store it
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

    // Handle empty or error states by returning a basic empty page
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
    
    // Cache the full result set (excluding pagination offset)
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
