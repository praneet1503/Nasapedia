'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import LoadingState from '../../components/LoadingState'
import Pagination from '../../components/Pagination'
import ProjectList from '../../components/ProjectList'
import { useAdaptiveFeedPaginated } from '../../hooks/useAdaptiveFeedPaginated'
import { recordProjectClick } from '../../lib/api'
import { getOrCreateVisitorUuid } from '../../lib/visitor'

const RESULTS_PER_PAGE = 20

export default function FeedPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [visitorUuid, setVisitorUuid] = useState('')

  useEffect(() => {
    // Visitor UUID creation/fetch point (persisted across sessions).
    setVisitorUuid(getOrCreateVisitorUuid())
  }, [])

  const { data, isLoading, isError, error, isPlaceholderData } = useAdaptiveFeedPaginated(
    page,
    visitorUuid,
    RESULTS_PER_PAGE
  )

  const projects = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = data?.totalPages ?? 0

  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : 'Something went wrong while fetching feed.'
    : null

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleProjectClick = (projectId: number) => {
    if (!visitorUuid) return
    void recordProjectClick(projectId, visitorUuid)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🛠️</span>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Adaptive Project Feed
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Personalized project feed based on popularity and freshness.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="space-btn text-sm"
          >
            🌍 All Projects
          </button>

          <button
            type="button"
            onClick={() => router.push('/search')}
            className="space-btn text-sm"
          >
            🔍 Search
          </button>
        </div>
      </header>

      <section>
        {errorMessage ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Receiving telemetry…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="space-glass p-6 text-center">
                <span className="text-3xl">&#x1F30C;</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No feed projects in this sector.</p>
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>📡 Recommended Missions</h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Showing {projects.length} of {totalCount} projects
                  </p>
                </div>

                <div
                  className={`transition-opacity duration-200 ${
                    isPlaceholderData ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  <ProjectList projects={projects} onProjectClick={handleProjectClick} />
                </div>

                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
