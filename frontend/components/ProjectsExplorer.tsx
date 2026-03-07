'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Filters from '../components/Filters'
import LoadingState from '../components/LoadingState'
import Pagination from '../components/Pagination'
import ProjectList from '../components/ProjectList'
import SearchBar from '../components/SearchBar'
import { useProjectsPaginated } from '../hooks/useProjectsPaginated'

const DEFAULT_ORDER = 'popularity'
const RESULTS_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

function parseOptionalInt(v: string): number | undefined {
  const trimmed = v.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return undefined
  const i = Math.trunc(n)
  if (String(i) !== trimmed && String(n) !== trimmed) {
  }
  return i
}

export default function ProjectsExplorer() {
  const [q, setQ] = useState('')
  const [trlMin, setTrlMin] = useState('')
  const [trlMax, setTrlMax] = useState('')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [organization, setOrganization] = useState('')
  const [technologyArea, setTechnologyArea] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword')

  const [hasSearched, setHasSearched] = useState(false)
  const [order, setOrder] = useState<string>(DEFAULT_ORDER)
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
      order,
      search_type: searchType,
    }),
    [q, trlMin, trlMax, organization, technologyArea, order, searchType]
  )

  function applySearch(nextParams: typeof appliedParams, searched = true) {
    setAppliedParams(nextParams)
    setHasSearched(searched)
    setPage(1)
  }

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    const hasSearchTerm = q.trim().length > 0
    const hasFilters =
      trlMin.trim().length > 0 ||
      trlMax.trim().length > 0 ||
      organization.trim().length > 0 ||
      technologyArea.trim().length > 0

    if (hasSearchTerm || hasFilters) {
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

  const activeFilterCount = [trlMin, trlMax, organization, technologyArea].filter((value) => value.trim().length > 0).length

  return (
    <main className="page-shell">
      <div className="surface-panel surface-panel--search">
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

        <div className="mt-5">
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => applySearch(effectiveParams, true)}
              disabled={isLoading}
              className="space-btn space-btn-primary border-0"
            >
              Search
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
                  search_type: 'keyword',
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

      <section className="page-section">
        {errorMessage ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Scanning NASA databases…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="surface-panel surface-panel--empty text-center">
                <span className="text-3xl">&#x1F30C;</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {hasSearched ? 'No missions found in this sector.' : 'No projects available in the database.'}
                </p>
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-5">
                <div className="section-heading-row">
                  <h2 className="section-title">
                    {hasSearched ? '📡 Search Results' : '🌍 All Missions'}
                  </h2>
                  <p className="section-meta">
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