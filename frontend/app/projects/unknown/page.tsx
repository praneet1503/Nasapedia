"use client"
import { useState } from 'react'
import ProjectList from '../../../components/ProjectList'
import LoadingState from '../../../components/LoadingState'
import Pagination from '../../../components/Pagination'
import { useProjectsPaginated } from '../../../hooks/useProjectsPaginated'

const RESULTS_PER_PAGE = 20

export default function UnknownProjectsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error } = useProjectsPaginated({
    page,
    limit: RESULTS_PER_PAGE,
    include_empty_descriptions: true,
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

  return (
    <main className="page-shell pt-10">
      <section className="page-section">
        {errorMessage ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{errorMessage}</div>
        ) : null}

        {isLoading && !projects.length ? (
          <LoadingState label="Loading uncatalogued mission data…" />
        ) : (
          <>
            {projects.length === 0 && !errorMessage ? (
              <div className="surface-panel surface-panel--empty text-center">
                <span className="text-3xl">📂</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No uncatalogued projects found.</p>
              </div>
            ) : null}

            {projects.length > 0 ? (
              <div className="space-y-5">
                <div className="section-heading-row">
                  <h2 className="section-title">📁 Mission Data (No Descriptions)</h2>
                  <p className="section-meta">Showing {projects.length} of {totalCount} projects</p>
                </div>

                <div>
                  <ProjectList projects={projects} />
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
