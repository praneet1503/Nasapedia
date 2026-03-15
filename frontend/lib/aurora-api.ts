import type { AuroraKpResponse, AuroraOvalResponse } from './aurora-types'

function getAuroraBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_AURORA_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (baseUrl) return `${baseUrl.replace(/\/+$/, '')}/api/aurora`

  throw new Error('NEXT_PUBLIC_API_AURORA_URL or NEXT_PUBLIC_API_URL is not defined')
}

async function fetchAurora<T>(endpoint: string): Promise<T> {
  const url = `${getAuroraBaseUrl()}${endpoint}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error(`Network error fetching aurora endpoint: ${endpoint}`)
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status} from aurora endpoint: ${endpoint}`)
  }

  return (await res.json()) as T
}

export function fetchAuroraOval(): Promise<AuroraOvalResponse> {
  return fetchAurora<AuroraOvalResponse>('/oval')
}

export function fetchAuroraKp(): Promise<AuroraKpResponse> {
  return fetchAurora<AuroraKpResponse>('/kp')
}
