export type Project = {
  id: number
  title: string
  description: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  trl: number | null
  organization: string | null
  technology_area: string | null
  last_updated: string
  popularity_score?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type IssLocation = {
  latitude: number
  longitude: number
  velocity: number
  visibility: string
  timestamp: number
  altitude?: number
}

export type ApiError = {
  error: string
}

export type SpaceDevsErrorType = 'INVALID_KEY' | 'RATE_LIMIT' | 'NETWORK' | 'UNKNOWN'

export type SpaceDevsValidationResult = {
  valid: boolean
  statusCode: number
  rateLimited: boolean
  quotaRemaining?: number
  errorType?: SpaceDevsErrorType
  rawResponse?: {
    endpoint?: string
    statusText?: string
    rateLimit?: {
      limit?: number
      remaining?: number
      retryAfter?: string
    }
    request?: {
      timeoutMs?: number
      attempt?: number
      latencyMs?: number
      authMode?: 'TOKEN' | 'ANON'
      apiKeyMasked?: string
    }
    bodyPreview?: string
    networkError?: {
      type?: string
      message?: string
    }
    cache?: 'HIT' | 'MISS'
  }
}

export type SpaceDevsLatencySample = {
  sample: number
  latencyMs: number
  statusCode: number
  error?: string
}

export type SpaceDevsEndpointLatency = {
  endpoint: string
  samples: number
  averageResponseTimeMs?: number | null
  latencies: SpaceDevsLatencySample[]
}

export type SpaceDevsLatencyProbe = {
  primary: SpaceDevsEndpointLatency
  secondary: SpaceDevsEndpointLatency
  fasterEndpoint?: string | null
}

export type GlobalLaunchIntelligenceResponse = {
  validation: SpaceDevsValidationResult
  latencyProbe?: SpaceDevsLatencyProbe
}

// ── Spaceflight News Types ──────────────────────────────────

export type SpaceContentItem = {
  id: number
  title: string
  summary: string
  image_url: string
  news_site: string
  published_at: string
  url: string
}

export type SpaceContentResponse = {
  items: SpaceContentItem[]
  next: string | null
  previous: string | null
}

