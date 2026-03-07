import Link from 'next/link'
import type { Project } from '../lib/types'

type ProjectCardProps = {
  project: Project
  onProjectClick?: (projectId: number) => void
}

function valueOrDash(v: string | number | null | undefined) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' && v.trim() === '') return ''
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
      className="project-card"
    >
      <div className="project-card__header">
        <div className="project-card__lead">
          <div className="project-card__title-group">
            <span className="project-card__eyebrow">{valueOrDash(project.organization)}</span>
            <h3 className="project-card__title">{project.title}</h3>
          </div>
        </div>

        <div className="project-card__badges">
          {typeof project.popularity_score !== 'undefined' && project.popularity_score > 0 ? (
            <span
              className="project-card__signal"
              aria-label={`popularity ${project.popularity_score}`}
              title={`Click count: ${Math.round(project.popularity_score)}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .587l3.668 7.431L23.5 9.75l-5.5 5.36L19.335 24 12 20.013 4.665 24 6 15.11 0.5 9.75l7.832-1.732z" />
              </svg>
              {Math.round(project.popularity_score)} signal
            </span>
          ) : null}

          <span className={trlClass(project.trl)}>
            TRL {valueOrDash(project.trl)}
          </span>
        </div>
      </div>

      {project.description && (
        <>
          <p className="project-card__description" dangerouslySetInnerHTML={{ __html: project.description }} />
          <div className="project-card__readmore">READ MORE</div>
        </>
      )}

      <div className="project-card__meta-grid">
        {project.organization && (
          <div className="project-card__meta-item">
            <span className="project-card__meta-label">Organization</span>
            <span className="project-card__meta-value">{project.organization}</span>
          </div>
        )}
        {project.technology_area && (
          <div className="project-card__meta-item">
            <span className="project-card__meta-label">Technology area</span>
            <span className="project-card__meta-value">{project.technology_area}</span>
          </div>
        )}
        {project.status && (
          <div className="project-card__meta-item">
            <span className="project-card__meta-label">Mission state</span>
            <span className="project-card__meta-value">{project.status}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

