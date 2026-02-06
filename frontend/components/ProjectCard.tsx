import Link from 'next/link'
import type { Project } from '../lib/types'

function valueOrDash(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  return String(v)
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/project/${project.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{project.title}</h3>
        <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700">
          TRL {valueOrDash(project.trl)}
        </span>
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
