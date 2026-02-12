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

export default function ProjectCard({ project, onProjectClick }: ProjectCardProps) {
  return (
    <Link
      href={`/project/${project.id}`}
      onClick={() => onProjectClick?.(project.id)}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{project.title}</h3>

          {/* Small popularity / click counter (frontend-only display). */}
          {typeof project.popularity_score !== 'undefined' ? (
            <span
              className={`shrink-0 flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                project.popularity_score > 0
                  ? 'border-slate-200 text-slate-800'
                  : 'border-transparent text-slate-400'
              }`}
              aria-label={`popularity ${project.popularity_score}`}
              title={`Click count: ${Math.round(project.popularity_score)}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
                <path d="M12 .587l3.668 7.431L23.5 9.75l-5.5 5.36L19.335 24 12 20.013 4.665 24 6 15.11 0.5 9.75l7.832-1.732z" />
              </svg>
              <span>{Math.round(project.popularity_score)}</span>
            </span>
          ) : null}

          <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700">
            TRL {valueOrDash(project.trl)}
          </span>
        </div>
      </div>

      {project.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-slate-700">{project.description}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No description available.</p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-3">
        <div>
          <span className="font-medium text-slate-700">Org:</span> {valueOrDash(project.organization)}
        </div>
        <div>
          <span className="font-medium text-slate-700">Area:</span>{' '}
          {valueOrDash(project.technology_area)}
        </div>
        <div>
          <span className="font-medium text-slate-700">Status:</span> {valueOrDash(project.status)}
        </div>
      </div>
    </Link>
  )
}
