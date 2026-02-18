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
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🛠️</span>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Mission Details</h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
              } else {
                router.push('/feed')
              }
            }}
            className="space-btn text-sm"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => router.push('/feed')}
            className="space-btn text-sm"
          >
            📡 Feed
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="space-btn text-sm"
          >
            🌍 All Projects
          </button>
        </div>
      </div>

      {isLoading ? <LoadingState label="Downloading mission data…" /> : null}

      {isError ? (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {error?.message || 'Communication lost. Could not retrieve mission data.'}
        </div>
      ) : null}

      {!isLoading && !isError && !project ? (
        <div className="space-glass p-6 text-center">
          <span className="text-3xl">&#x1F30C;</span>
          <h2 className="mt-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Mission Not Found</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>This mission does not exist in the database (or is classified).</p>
        </div>
      ) : null}

      {!isLoading && project ? (
        <div className="space-glass p-6">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🚀</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{project.title}</h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📡 Status</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{valueOrDash(project.status)}</div>
            </div>
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📊 TRL Level</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{valueOrDash(project.trl)}</div>
            </div>
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>🏢 Organization</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{valueOrDash(project.organization)}</div>
            </div>
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>🔬 Technology Area</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{valueOrDash(project.technology_area)}</div>
            </div>
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>🚀 Launch Date</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{formatDate(project.start_date)}</div>
            </div>
            <div className="space-card p-3">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>🏁 End Date</div>
              <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{formatDate(project.end_date)}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📄 Mission Brief</div>
            {project.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
            ) : (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No mission brief available.</p>
            )}
          </div>

          <div className="mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Last telemetry: <span style={{ color: 'var(--text-secondary)' }}>{valueOrDash(project.last_updated)}</span>
          </div>
        </div>
      ) : null}
    </main>
  )
}
