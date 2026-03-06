'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import LoadingState from '../../components/LoadingState'
import Pagination from '../../components/Pagination'
import ProjectList from '../../components/ProjectList'
import TopNav from '../../components/TopNav'
import { useAdaptiveFeedPaginated } from '../../hooks/useAdaptiveFeedPaginated'
import { recordProjectClick } from '../../lib/api'
import { getOrCreateVisitorUuid } from '../../lib/visitor'

const RESULTS_PER_PAGE = 20

export default function FeedPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [visitorUuid, setVisitorUuid] = useState('')

  useEffect(() => {
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
    <main className="page-shell">
      <header className="page-hero page-hero--feed">
        <div className="page-hero__copy">
          <div className="page-eyebrow">
            Adaptive Feed
            <span className="page-eyebrow__tag">Personalized ranking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🛠️</span>
            <h1 className="page-title">Adaptive Project Feed</h1>
          </div>
          <p className="page-subtitle">
            Personalized project sequencing tuned around popularity, freshness, and your active visitor profile so the highest-signal missions surface first.
          </p>
        </div>

        <div className="page-hero__rail">
          <TopNav />

          <div className="page-hero__stats">
            <div className="page-stat">
              <span className="page-stat__label">Profile state</span>
              <strong className="page-stat__value">{visitorUuid ? 'Synced' : 'Booting'}</strong>
              <span className="page-stat__hint">personal signal fingerprint</span>
            </div>
            <div className="page-stat">
              <span className="page-stat__label">Visible missions</span>
              <strong className="page-stat__value">{projects.length || '—'}</strong>
              <span className="page-stat__hint">current page density</span>
            </div>
            <div className="page-stat">
              <span className="page-stat__label">Ranking mode</span>
              <strong className="page-stat__value">Adaptive</strong>
              <span className="page-stat__hint">freshness + popularity blend</span>
            </div>
          </div>
        </div>
      </header>

      <section className="page-section">
        {errorMessage ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Receiving telemetry…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="surface-panel surface-panel--empty text-center">
                <span className="text-3xl">&#x1F30C;</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No feed projects in this sector.</p>
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-5">
                <div className="section-heading-row">
                  <h2 className="section-title">📡 Recommended Missions</h2>
                  <p className="section-meta">
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
