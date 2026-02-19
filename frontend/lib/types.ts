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
