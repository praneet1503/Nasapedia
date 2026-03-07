import type { SpaceContentResponse } from './types'

function getSpaceApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_SPACE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (baseUrl) return `${baseUrl.replace(/\/+$/, '')}/api/space`

  throw new Error(
    'NEXT_PUBLIC_API_SPACE_URL or NEXT_PUBLIC_API_URL is not defined in environment variables'
  )
}

const EMPTY_RESPONSE: SpaceContentResponse = { items: [], next: null, previous: null }

const inFlightRequests = new Map<string, Promise<SpaceContentResponse>>()

async function fetchSpaceContent(
  endpoint: string,
  limit: number,
  offset: number,
): Promise<SpaceContentResponse> {
  const base = getSpaceApiBaseUrl()
  const url = `${base}/${endpoint}?limit=${limit}&offset=${offset}`

  const existing = inFlightRequests.get(url)
  if (existing) return existing

  const request = (async () => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) {
        return EMPTY_RESPONSE
      }

      const data = (await res.json()) as SpaceContentResponse
      return data
    } catch {
      return EMPTY_RESPONSE
    } finally {
      inFlightRequests.delete(url)
    }
  })()

  inFlightRequests.set(url, request)
  return request
}

export function fetchSpaceArticles(
  limit: number = 20,
  offset: number = 0,
): Promise<SpaceContentResponse> {
  return fetchSpaceContent('articles', limit, offset)
}

export function fetchSpaceBlogs(
  limit: number = 20,
  offset: number = 0,
): Promise<SpaceContentResponse> {
  return fetchSpaceContent('blogs', limit, offset)
}
