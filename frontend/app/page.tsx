'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Filters from '../components/Filters'
import LoadingState from '../components/LoadingState'
import ProjectList from '../components/ProjectList'
import Pagination from '../components/Pagination'
import SearchBar from '../components/SearchBar'
import { useProjectsPaginated } from '../hooks/useProjectsPaginated'

const DEFAULT_ORDER = 'popularity'
const RESULTS_PER_PAGE = 10

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
  const [organization, setOrganization] = useState('')
  const [technologyArea, setTechnologyArea] = useState('')

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
  }))

  const effectiveParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      trl_min: parseOptionalInt(trlMin),
      trl_max: parseOptionalInt(trlMax),
      organization: organization.trim() || undefined,
      technology_area: technologyArea.trim() || undefined,
      order: order,
    }),
    [q, trlMin, trlMax, organization, technologyArea, order]
  )

  function applySearch(nextParams: typeof appliedParams, searched = true) {
    setAppliedParams(nextParams)
    setHasSearched(searched)
    setPage(1) // Requirement: Reset to page 1 on filter/search change
  }

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
      <header
        className="mb-6"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">NASA TechPort Explorer</h1>

          <div className="ml-2 flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/feed')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              View feed
            </button>
          </div>
        </div>

        <div className="mission-clock">
          <span className="mission-label">ARTEMIS II</span>
          <span id="mission-countdown">T-000:00:00:00</span>
        </div>

        <p className="mt-1 text-sm text-slate-600" style={{ flexBasis: '100%' }}>
          Search NASA TechPort projects by keyword and filter by TRL, organization, and technology area.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SearchBar value={q} onChange={setQ} onSubmit={() => applySearch(effectiveParams, true)} isLoading={isLoading} />

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
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Search
            </button>

            <label className="text-sm flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort:</span>
              <select
                value={order}
                onChange={(e) => {
                  const nextOrder = e.target.value
                  setOrder(nextOrder)
                  // Immediately apply sort as a new search/filter action
                  applySearch({ ...effectiveParams, order: nextOrder }, true)
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option value="title_asc">Alphabetical A→Z</option>
                <option value="title_desc">Alphabetical Z→A</option>
                <option value="relevance">Relevance (when searching)</option>
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
              className="text-sm text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <section className="mt-6">
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Loading projects…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
               <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                {hasSearched ? 'No results found.' : 'No projects available.'}
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">{hasSearched ? 'Search results' : 'All projects'}</h2>
                  <p className="text-sm text-slate-500">
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
