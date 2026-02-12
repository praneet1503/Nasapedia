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
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Adaptive Project Feed</h1>
          <p className="mt-1 text-sm text-slate-600">
            Personalized project feed based on popularity and freshness.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            All projects
          </button>

          <button
            type="button"
            onClick={() => router.push('/search')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Search
          </button>
        </div>
      </header>

      <section>
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Loading feed…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                No feed projects available.
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Recommended projects</h2>
                  <p className="text-sm text-slate-500">
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
