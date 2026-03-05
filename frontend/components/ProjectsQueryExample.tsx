'use client'

import { useQueryClient } from '@tanstack/react-query'
import LoadingState from './LoadingState'
import ProjectList from './ProjectList'
import { projectsQueryKey, useProjects } from '../src/hooks/useProjects'

export default function ProjectsQueryExample() {
  const queryClient = useQueryClient()
  const { projects, isLoading, isError, error, isFetching } = useProjects()

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Cached projects</h2>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: projectsQueryKey })}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {isLoading && projects.length === 0 ? <LoadingState label="Loading projects…" /> : null}

      {isError ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Something went wrong while fetching projects.'}
        </div>
      ) : null}

      {!isLoading && !isError && projects.length === 0 ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          No projects available.
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div className="mt-4 space-y-3">
          {isFetching ? <p className="text-xs text-slate-500">Refreshing in background…</p> : null}
          <ProjectList projects={projects} />
        </div>
      ) : null}
    </section>
  )
}

