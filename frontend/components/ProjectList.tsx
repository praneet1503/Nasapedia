import type { Project } from '../lib/types'
import ProjectCard from './ProjectCard'

type ProjectListProps = {
  projects: Project[]
  onProjectClick?: (projectId: number) => void
}

export default function ProjectList({ projects, onProjectClick }: ProjectListProps) {
  return (
    <div className="project-list">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} onProjectClick={onProjectClick} />
      ))}
    </div>
  )
}

