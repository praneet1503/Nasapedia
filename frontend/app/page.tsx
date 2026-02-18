'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Filters from '../components/Filters'
import LoadingState from '../components/LoadingState'
import ProjectList from '../components/ProjectList'
import Pagination from '../components/Pagination'
import SearchBar from '../components/SearchBar'
import { useProjectsPaginated } from '../hooks/useProjectsPaginated'

const DEFAULT_ORDER = 'popularity'
const RESULTS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300 // Auto-search after 300ms of no typing

function parseOptionalInt(v: string): number | undefined {
  const trimmed = v.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return undefined
  const i = Math.trunc(n)
  if (String(i) !== trimmed && String(n) !== trimmed) {
    // allow "3.0" but avoid weird strings
  }
  return i
}

export default function HomePage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [trlMin, setTrlMin] = useState('')
  const [trlMax, setTrlMax] = useState('')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [organization, setOrganization] = useState('')
  const [technologyArea, setTechnologyArea] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword')

  const [hasSearched, setHasSearched] = useState(false)
  const [order, setOrder] = useState<string>(DEFAULT_ORDER)
  
  // Pagination State
  const [page, setPage] = useState(1)

  const [appliedParams, setAppliedParams] = useState(() => ({
    q: undefined as string | undefined,
    trl_min: undefined as number | undefined,
    trl_max: undefined as number | undefined,
    organization: undefined as string | undefined,
    technology_area: undefined as string | undefined,
    order: DEFAULT_ORDER,
    search_type: 'keyword' as 'keyword' | 'semantic',
  }))

  const effectiveParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      trl_min: parseOptionalInt(trlMin),
      trl_max: parseOptionalInt(trlMax),
      organization: organization.trim() || undefined,
      technology_area: technologyArea.trim() || undefined,
      order: order,
      search_type: searchType,
    }),
    [q, trlMin, trlMax, organization, technologyArea, order, searchType]
  )

  function applySearch(nextParams: typeof appliedParams, searched = true) {
    setAppliedParams(nextParams)
    setHasSearched(searched)
    setPage(1) // Requirement: Reset to page 1 on filter/search change
  }

  // Auto-search effect: debounce and auto-apply search when query or filters change
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Only auto-search if user has typed something or changed filters
    const hasSearchTerm = q.trim().length > 0
    const hasFilters =
      trlMin.trim().length > 0 ||
      trlMax.trim().length > 0 ||
      organization.trim().length > 0 ||
      technologyArea.trim().length > 0

    if (hasSearchTerm || hasFilters) {
      // Debounce before auto-searching
      debounceTimeoutRef.current = setTimeout(() => {
        applySearch(effectiveParams, true)
      }, SEARCH_DEBOUNCE_MS)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [q, trlMin, trlMax, organization, technologyArea, effectiveParams])

  const { data, isLoading, isError, error, isPlaceholderData } = useProjectsPaginated({
    ...appliedParams,
    page,
    limit: RESULTS_PER_PAGE,
  })

  // Derive projects and total from query result
  // If data is undefined (loading first time), defaults to empty
  const projects = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = data?.totalPages ?? 0

  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : 'Something went wrong while fetching projects.'
    : null

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const initCountdown = () => {
      const countdownEl = document.getElementById('mission-countdown')
      if (!countdownEl) return

      // Temporary: show delayed state instead of running the timer
      const showDelayed = true
      if (showDelayed) {
        countdownEl.textContent = 'T- Delayed'
        return
      }

      const targetTime = new Date('March 6, 2026 20:29:00 GMT-0500').getTime()
      if (!Number.isFinite(targetTime)) return

      const formatCountdown = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000))
        const days = Math.floor(totalSeconds / 86400)
        const hours = Math.floor((totalSeconds % 86400) / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const pad = (value: number, size: number) => String(value).padStart(size, '0')
        return `T-${pad(days, 3)}:${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`
      }

      const tick = () => {
        const now = Date.now()
        const delta = targetTime - now
        if (delta <= 0) {
          countdownEl.textContent = 'T-000:00:00:00'
          return false
        }
        countdownEl.textContent = formatCountdown(delta)
        return true
      }

      tick()
      const intervalId = window.setInterval(() => {
        if (!tick()) {
          window.clearInterval(intervalId)
        }
      }, 1000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCountdown)
      return () => document.removeEventListener('DOMContentLoaded', initCountdown)
    }

    initCountdown()
    return undefined
  }, [])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* ── Space Hero Header ───────────────────────────────── */}
      <header className="mb-8">
        <div
          className="flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🚀</span>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NASA TechPort Explorer
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                MISSION CONTROL · TECHNOLOGY DATABASE
              </p>
            </div>

            <div className="ml-2 flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/feed')}
                className="space-btn text-sm"
              >
                🛠️ View Feed
              </button>
            </div>
          </div>

          <div className="mission-clock">
            <span className="mission-label">ARTEMIS II</span>
            <span id="mission-countdown">T-000:00:00:00</span>
          </div>
        </div>

        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Search NASA TechPort projects by keyword and filter by TRL, organization, and technology area.
        </p>
      </header>

      {/* ── Search & Filter Panel ───────────────────────────── */}
      <div className="space-glass p-5">
        <SearchBar 
          value={q} 
          onChange={setQ} 
          onSubmit={() => applySearch(effectiveParams, true)} 
          isLoading={isLoading}
          searchType={searchType}
          onSearchTypeChange={(type) => {
            setSearchType(type)
            applySearch({ ...effectiveParams, search_type: type }, true)
          }}
        />

        <div className="mt-4">
          <Filters
            trlMin={trlMin}
            trlMax={trlMax}
            organization={organization}
            technologyArea={technologyArea}
            onChange={(next) => {
              if (next.trlMin !== undefined) setTrlMin(next.trlMin)
              if (next.trlMax !== undefined) setTrlMax(next.trlMax)
              if (next.organization !== undefined) setOrganization(next.organization)
              if (next.technologyArea !== undefined) setTechnologyArea(next.technologyArea)
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => applySearch(effectiveParams, true)}
              disabled={isLoading}
              className="space-btn space-btn-primary"
            >
              🔭 Search
            </button>

            <label className="text-sm flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Sort:</span>
              <select
                value={order}
                onChange={(e) => {
                  const nextOrder = e.target.value
                  setOrder(nextOrder)
                  applySearch({ ...effectiveParams, order: nextOrder }, true)
                }}
                className="space-input py-1 px-2 text-sm"
              >
                <option value="title_asc">Alphabetical A→Z</option>
                <option value="title_desc">Alphabetical Z→A</option>
                <option value="relevance">Relevance</option>
                <option value="popularity">Most popular</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setQ('')
                setTrlMin('')
                setTrlMax('')
                setOrganization('')
                setTechnologyArea('')
                setHasSearched(false)
                setOrder(DEFAULT_ORDER)
                setPage(1)
                applySearch(
                  {
                    q: undefined,
                    trl_min: undefined,
                    trl_max: undefined,
                    organization: undefined,
                    technology_area: undefined,
                    order: DEFAULT_ORDER,
                  },
                  false
                )
              }}
              disabled={isLoading}
              className="text-sm hover:underline disabled:opacity-50"
              style={{ color: 'var(--text-muted)' }}
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────── */}
      <section className="mt-6">
        {errorMessage ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Scanning NASA databases…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="space-glass p-6 text-center">
                <span className="text-3xl">&#x1F30C;</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {hasSearched ? 'No missions found in this sector.' : 'No projects available in the database.'}
                </p>
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {hasSearched ? '📡 Search Results' : '🌍 All Missions'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Showing {projects.length} of {totalCount} projects
                  </p>
                </div>

                <div className={`transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
                  <ProjectList projects={projects} />
                </div>
                
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
