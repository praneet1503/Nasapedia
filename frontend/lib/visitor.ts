const VISITOR_UUID_STORAGE_KEY = 'nasapedia_visitor_uuid'
const VISITOR_UUID_COOKIE_KEY = 'nasapedia_visitor_uuid'

function generateVisitorUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // Fallback UUID-like value for environments without crypto.randomUUID
  const random = Math.random().toString(16).slice(2)
  const ts = Date.now().toString(16)
  return `${ts}-${random}`
}

function setVisitorCookie(visitorUuid: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${VISITOR_UUID_COOKIE_KEY}=${encodeURIComponent(visitorUuid)}; path=/; max-age=31536000; samesite=lax`
}

function getVisitorCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const rawCookie of cookies) {
    const [name, ...rest] = rawCookie.trim().split('=')
    if (name === VISITOR_UUID_COOKIE_KEY) {
      const value = rest.join('=')
      return value ? decodeURIComponent(value) : null
    }
  }
  return null
}

export function getOrCreateVisitorUuid(): string {
  if (typeof window === 'undefined') return 'server-render'

  // Visitor UUID storage/fetch point: persisted in localStorage + cookie for cross-session continuity.
  const fromStorage = window.localStorage.getItem(VISITOR_UUID_STORAGE_KEY)
  if (fromStorage) {
    setVisitorCookie(fromStorage)
    return fromStorage
  }

  const fromCookie = getVisitorCookie()
  if (fromCookie) {
    window.localStorage.setItem(VISITOR_UUID_STORAGE_KEY, fromCookie)
    return fromCookie
  }

  const created = generateVisitorUuid()
  window.localStorage.setItem(VISITOR_UUID_STORAGE_KEY, created)
  setVisitorCookie(created)
  return created
}
