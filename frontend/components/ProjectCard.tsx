import Link from 'next/link'
import type { Project } from '../lib/types'

type ProjectCardProps = {
  project: Project
  onProjectClick?: (projectId: number) => void
}

function valueOrDash(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  return String(v)
}

function trlClass(trl: number | null | undefined): string {
  if (trl == null) return 'trl-badge trl-mid'
  if (trl <= 3) return 'trl-badge trl-low'
  if (trl <= 6) return 'trl-badge trl-mid'
  return 'trl-badge trl-high'
}

function statusIcon(status: string | null | undefined) {
  const s = (status ?? '').toLowerCase()
  if (s.includes('active') || s.includes('ongoing')) return '🛰️'
  if (s.includes('completed') || s.includes('closed')) return '✅'
  if (s.includes('planned') || s.includes('proposed')) return '🚀'
  return '🔭'
}

export default function ProjectCard({ project, onProjectClick }: ProjectCardProps) {
  return (
    <Link
      href={`/project/${project.id}`}
      onClick={() => onProjectClick?.(project.id)}
      className="block space-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base" aria-hidden="true">{statusIcon(project.status)}</span>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>

          {/* Popularity indicator */}
          {typeof project.popularity_score !== 'undefined' && project.popularity_score > 0 ? (
            <span
              className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' }}
              aria-label={`popularity ${project.popularity_score}`}
              title={`Click count: ${Math.round(project.popularity_score)}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .587l3.668 7.431L23.5 9.75l-5.5 5.36L19.335 24 12 20.013 4.665 24 6 15.11 0.5 9.75l7.832-1.732z" />
              </svg>
              {Math.round(project.popularity_score)}
            </span>
          ) : null}

          {/* TRL badge with color coding */}
          <span className={trlClass(project.trl)}>
            TRL {valueOrDash(project.trl)}
          </span>
        </div>
      </div>

      {project.description ? (
        <p className="mt-2 line-clamp-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
      ) : (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No telemetry data available.</p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-1 text-xs md:grid-cols-3" style={{ color: 'var(--text-muted)' }}>
        <div>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Org:</span> {valueOrDash(project.organization)}
        </div>
        <div>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Area:</span>{' '}
          {valueOrDash(project.technology_area)}
        </div>
        <div>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span> {valueOrDash(project.status)}
        </div>
      </div>
    </Link>
  )
}
