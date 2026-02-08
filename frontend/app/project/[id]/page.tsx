'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LoadingState from '../../../components/LoadingState'
import { useProject } from '../../../src/hooks/useProject'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function valueOrDash(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  return String(v)
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const projectId = useMemo(() => {
    const raw = params?.id
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
  }, [params])

  const { data: project, isLoading, isError, error } = useProject(projectId)

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Project</h1>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          ← Back
        </button>
      </div>

      {isLoading ? <LoadingState label="Loading project…" /> : null}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error?.message || 'Something went wrong while fetching this project.'}
        </div>
      ) : null}

      {!isLoading && !isError && !project ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold">Not found</h2>
          <p className="mt-1 text-sm text-slate-700">This project does not exist (or is unavailable).</p>
        </div>
      ) : null}

      {!isLoading && project ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>

          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">Status</div>
              <div className="mt-1 text-slate-900">{valueOrDash(project.status)}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">TRL</div>
              <div className="mt-1 text-slate-900">{valueOrDash(project.trl)}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">Organization</div>
              <div className="mt-1 text-slate-900">{valueOrDash(project.organization)}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">Technology area</div>
              <div className="mt-1 text-slate-900">{valueOrDash(project.technology_area)}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">Start date</div>
              <div className="mt-1 text-slate-900">{formatDate(project.start_date)}</div>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-700">End date</div>
              <div className="mt-1 text-slate-900">{formatDate(project.end_date)}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-slate-700">Description</div>
            {project.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{project.description}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No description available.</p>
            )}
          </div>

          <div className="mt-5 text-xs text-slate-600">
            Last updated: <span className="text-slate-800">{valueOrDash(project.last_updated)}</span>
          </div>
        </div>
      ) : null}
    </main>
  )
}
