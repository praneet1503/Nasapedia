'use client'

import { useMemo, useState } from 'react'
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
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      trl_min: parseOptionalInt(trlMin),
      trl_max: parseOptionalInt(trlMax),
      organization: organization.trim() || undefined,
      technology_area: technologyArea.trim() || undefined,
      limit: PAGE_SIZE,
    }),
    [q, trlMin, trlMax, organization, technologyArea]
  )

  async function runSearch(nextOffset: number, mode: 'replace' | 'append') {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchProjects({ ...effectiveParams, offset: nextOffset })
      setHasSearched(true)
      setOffset(nextOffset)
      setProjects((prev) => (mode === 'replace' ? result : [...prev, ...result]))
      setHasMore(result.length === PAGE_SIZE)
    } catch (e) {
      setHasSearched(true)
      setError('Something went wrong while fetching projects.')
      setProjects((prev) => (mode === 'replace' ? [] : prev))
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">NASA TechPort Explorer</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search NASA TechPort projects by keyword and filter by TRL, organization, and technology area.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <SearchBar value={q} onChange={setQ} onSubmit={() => runSearch(0, 'replace')} isLoading={isLoading} />

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
          <button
            type="button"
            onClick={() => runSearch(0, 'replace')}
            disabled={isLoading}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => {
              setQ('')
              setTrlMin('')
              setTrlMax('')
              setOrganization('')
              setTechnologyArea('')
              setProjects([])
              setOffset(0)
              setHasMore(false)
              setHasSearched(false)
              setError(null)
            }}
            disabled={isLoading}
            className="text-sm text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
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

        {projects.length > 0 ? (
          <div className="space-y-4">
            <ProjectList projects={projects} />

            <div className="flex justify-center">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => runSearch(offset + PAGE_SIZE, 'append')}
                  disabled={isLoading}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Loading…' : 'Load more'}
                </button>
              ) : hasSearched ? (
                <p className="text-sm text-slate-600">End of results.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
