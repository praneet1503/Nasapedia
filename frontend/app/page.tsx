'use client'

import { useMemo, useState, useEffect } from 'react'
import Filters from '../components/Filters'
import LoadingState from '../components/LoadingState'
import ProjectList from '../components/ProjectList'
import SearchBar from '../components/SearchBar'
import { fetchProjects } from '../lib/api'
import type { Project } from '../lib/types'

const PAGE_SIZE = 20

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
  const [q, setQ] = useState('')
  const [trlMin, setTrlMin] = useState('')
  const [trlMax, setTrlMax] = useState('')
  const [organization, setOrganization] = useState('')
  const [technologyArea, setTechnologyArea] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<string>('title_asc')

  const effectiveParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      trl_min: parseOptionalInt(trlMin),
      trl_max: parseOptionalInt(trlMax),
      organization: organization.trim() || undefined,
      technology_area: technologyArea.trim() || undefined,
      order: order,
      limit: PAGE_SIZE,
    }),
    [q, trlMin, trlMax, organization, technologyArea, order]
  )

  async function runSearch(pageIndex: number) {
    setIsLoading(true)
    setError(null)
    try {
      const offset = pageIndex * PAGE_SIZE
      const result = await fetchProjects({ ...effectiveParams, offset })
      setHasSearched(true)
      setCurrentPage(pageIndex)
      setProjects(result.projects)
      setTotalCount(result.total)
      setHasMore(result.projects.length === PAGE_SIZE)
    } catch (e) {
      setHasSearched(true)
      setError('Something went wrong while fetching projects.')
      setProjects([])
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }


  // Helper: render compact Google-like pagination (centered small numbers + Next)
  function renderPageButtons(total: number, pageSize: number, current: number, onClickPage: (p: number) => void, disabled?: boolean) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null

    // Build a small window of pages similar to Google
    const pages: (number | '...')[] = []
    const addRange = (from: number, to: number) => {
      for (let i = from; i <= to; i++) pages.push(i)
    }

    // If small number of pages, show them all
    if (totalPages <= 9) {
      addRange(0, totalPages - 1)
    } else {
      // show first 3, a window around current, and last 3 with ellipses
      addRange(0, 2)
      if (current > 4) pages.push('...')
      const start = Math.max(3, current - 1)
      const end = Math.min(totalPages - 4, current + 1)
      addRange(start, end)
      if (current < totalPages - 5) pages.push('...')
      addRange(totalPages - 3, totalPages - 1)
    }

    return (
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-3" aria-label="Pagination">
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`e-${idx}`} className="text-sm text-slate-500">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onClickPage(p)}
                disabled={disabled || p === current}
                aria-current={p === current ? 'page' : undefined}
                className={`text-sm ${p === current ? 'bg-blue-600 text-white font-medium rounded-full px-2 py-0.5' : 'text-blue-600 hover:underline'}`}
              >
                {p + 1}
              </button>
            )
          )}
        </nav>

        <button
          type="button"
          onClick={() => onClickPage(Math.min(totalPages - 1, current + 1))}
          disabled={disabled || current >= totalPages - 1}
          aria-label="Next page"
          className="text-sm text-blue-600 hover:underline"
        >
          Next
        </button>
      </div>
    )
  }

  // Load first page (All projects) on mount, and whenever the user clears search results or changes sort
  useEffect(() => {
    if (!hasSearched) {
      void runSearch(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, order])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">NASA TechPort Explorer</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search NASA TechPort projects by keyword and filter by TRL, organization, and technology area.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SearchBar value={q} onChange={setQ} onSubmit={() => runSearch(0)} isLoading={isLoading} />

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
              onClick={() => runSearch(0)}
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
                  setOrder(e.target.value)
                  void runSearch(0)
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option value="title_asc">Alphabetical A→Z</option>
                <option value="title_desc">Alphabetical Z→A</option>
                <option value="relevance">Relevance (when searching)</option>
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
                setProjects([])
                setCurrentPage(0)
                setTotalCount(0)
                setHasMore(false)
                setHasSearched(false)
                setError(null)
                setOrder('title_asc')
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
        {isLoading && projects.length === 0 ? <LoadingState label="Loading projects…" /> : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        {!isLoading && hasSearched && projects.length === 0 && !error ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            No results found.
          </div>
        ) : null}

        {!isLoading && !hasSearched && projects.length === 0 && !error ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            No projects available.
          </div>
        ) : null}

        {projects.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{hasSearched ? 'Search results' : 'All projects'}</h2>
              {!hasSearched ? (
                <p className="text-sm text-slate-500">Showing all projects from the connected database — use the search to filter.</p>
              ) : null}
            </div>

            <ProjectList projects={projects} />

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-600">
                  {totalCount > 0 ? (
                    <>
                      Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of {totalCount} • Page {currentPage + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-center">
                {renderPageButtons(totalCount, PAGE_SIZE, currentPage, (p) => runSearch(p), isLoading)}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
