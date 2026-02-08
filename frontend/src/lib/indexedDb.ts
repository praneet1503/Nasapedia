import type { Project } from '../../lib/types'

const DB_NAME = 'nasa-techport-cache'
const DB_VERSION = 1
const PROJECTS_STORE = 'projects'
const PAGES_STORE = 'pages'

export type PageRecord = {
  key: string
  ids: number[]
  total: number
  updatedAt: number
}

type ProjectRecord = {
  id: number
  project: Project
  updatedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        db.createObjectStore(PAGES_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    fn(store)

    tx.oncomplete = () => resolve(undefined as T)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getProject(id: number): Promise<Project | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readonly')
    const store = tx.objectStore(PROJECTS_STORE)
    const request = store.get(id)
    request.onsuccess = () => {
      const record = request.result as ProjectRecord | undefined
      resolve(record?.project ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getProjects(ids: number[]): Promise<Project[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readonly')
    const store = tx.objectStore(PROJECTS_STORE)
    const results: Project[] = []
    let pending = ids.length

    if (pending === 0) {
      resolve([])
      return
    }

    ids.forEach((id, idx) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const record = request.result as ProjectRecord | undefined
        if (record?.project) results[idx] = record.project
        pending -= 1
        if (pending === 0) resolve(results.filter(Boolean))
      }
      request.onerror = () => reject(request.error)
    })
  })
}

export async function setProject(project: Project): Promise<void> {
  // Store each project independently to avoid large blobs and keep writes incremental.
  const record: ProjectRecord = { id: project.id, project, updatedAt: Date.now() }
  await withStore(PROJECTS_STORE, 'readwrite', (store) => {
    store.put(record)
  })
}

export async function getPage(key: string): Promise<PageRecord | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, 'readonly')
    const store = tx.objectStore(PAGES_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve((request.result as PageRecord) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function setPage(record: PageRecord): Promise<void> {
  // Store page metadata separately so pagination history stays lightweight.
  await withStore(PAGES_STORE, 'readwrite', (store) => {
    store.put(record)
  })
}

export async function evictOldPages(maxPages: number): Promise<void> {
  // Evict only page metadata; projects can be reused across pages without re-fetching.
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, 'readwrite')
    const store = tx.objectStore(PAGES_STORE)
    const request = store.getAll()

    request.onsuccess = () => {
      const pages = (request.result as PageRecord[]).sort((a, b) => b.updatedAt - a.updatedAt)
      const toDelete = pages.slice(maxPages)
      toDelete.forEach((page) => store.delete(page.key))
      resolve()
    }

    request.onerror = () => reject(request.error)
  })
}
