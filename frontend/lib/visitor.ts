const VISITOR_UUID_STORAGE_KEY = 'nasapedia_visitor_uuid'
const VISITOR_UUID_COOKIE_KEY = 'nasapedia_visitor_uuid'

function generateVisitorUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

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

// ── Space Content Activity Tracking ──────────────────────────

const ACTIVITY_COOKIE_KEY = 'nasapedia_user_activity'
const ACTIVITY_STORAGE_KEY = 'nasapedia_user_activity'
const MAX_TRACKED_IDS = 50

interface UserActivity {
  visited_articles: number[]
  visited_blogs: number[]
  last_visit: number
}

function defaultActivity(): UserActivity {
  return { visited_articles: [], visited_blogs: [], last_visit: Date.now() }
}

function getActivityFromCookie(): UserActivity | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const rawCookie of cookies) {
    const [name, ...rest] = rawCookie.trim().split('=')
    if (name === ACTIVITY_COOKIE_KEY) {
      const value = rest.join('=')
      if (!value) return null
      try {
        return JSON.parse(decodeURIComponent(value)) as UserActivity
      } catch {
        return null
      }
    }
  }
  return null
}

function getActivity(): UserActivity {
  if (typeof window === 'undefined') return defaultActivity()

  const fromStorage = window.localStorage.getItem(ACTIVITY_STORAGE_KEY)
  if (fromStorage) {
    try {
      return JSON.parse(fromStorage) as UserActivity
    } catch { /* fall through */ }
  }

  const fromCookie = getActivityFromCookie()
  if (fromCookie) return fromCookie

  return defaultActivity()
}

function persistActivity(activity: UserActivity): void {
  if (typeof window === 'undefined') return
  const json = JSON.stringify(activity)
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, json)
  if (typeof document !== 'undefined') {
    document.cookie = `${ACTIVITY_COOKIE_KEY}=${encodeURIComponent(json)}; path=/; max-age=31536000; samesite=lax`
  }
}

export function recordSpaceClick(id: number, type: 'article' | 'blog'): void {
  if (typeof window === 'undefined') return

  const activity = getActivity()
  const list = type === 'article' ? activity.visited_articles : activity.visited_blogs

  if (!list.includes(id)) {
    list.push(id)
    // Keep bounded to prevent cookie overflow
    if (list.length > MAX_TRACKED_IDS) {
      list.splice(0, list.length - MAX_TRACKED_IDS)
    }
  }

  activity.last_visit = Date.now()
  persistActivity(activity)
}
