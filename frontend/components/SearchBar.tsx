'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchProjects } from '../lib/api'
import type { Project } from '../lib/types'

type SearchBarProps = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading?: boolean
  searchType?: 'keyword' | 'semantic'
  onSearchTypeChange?: (type: 'keyword' | 'semantic') => void
}

export default function SearchBar({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading,
  searchType = 'keyword',
  onSearchTypeChange,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const [suggestions, setSuggestions] = useState<Project[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setSuggestionsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetchProjects({
          q: trimmed,
          search_type: 'keyword',
          page: 1,
          limit: 5,
        })
        setSuggestions(res.data)
        setShowDropdown(res.data.length > 0)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
        setShowDropdown(false)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 200)

    return () => {
      clearTimeout(timer)
      setSuggestionsLoading(false)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navigateToProject = useCallback((project: Project) => {
    setShowDropdown(false)
    router.push(`/project/${project.id}`)
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowDropdown(false)
    onSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          navigateToProject(suggestions[activeIndex])
        } else {
          setShowDropdown(false)
          onSubmit()
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div className="search-suite" ref={wrapperRef}>
      <form
        className="search-suite__form"
        onSubmit={handleSubmit}
      >
        <div className="relative w-full">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ color: 'var(--text-muted)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              if (e.target.value.trim().length >= 2) setShowDropdown(true)
            }}
            onFocus={() => {
              if (suggestions.length > 0 && value.trim().length >= 2) setShowDropdown(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search NASA missions & projects…"
            className="space-input w-full pl-10 pr-10"
            aria-label="Search projects"
            aria-live="polite"
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          />

          {showDropdown && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="search-suite__dropdown absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto overflow-x-hidden rounded-lg border shadow-xl"
              style={{
                backgroundColor: 'var(--space-surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 12px 28px rgba(2, 6, 23, 0.75)',
              }}
            >
              {suggestions.map((project, idx) => (
                <li
                  key={project.id}
                  id={`suggestion-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    navigateToProject(project)
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: idx === activeIndex ? 'rgba(242, 196, 13, 0.08)' : 'transparent',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm"
                    style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}
                  >
                    ID
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {project.title}
                    </p>
                    {project.organization && (
                      <p
                        className="truncate text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {project.organization}
                      </p>
                    )}
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className="shrink-0 transition-transform"
                    style={{
                      color: idx === activeIndex ? 'var(--accent)' : 'var(--text-muted)',
                      transform: idx === activeIndex ? 'translateX(2px)' : 'none',
                    }}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={Boolean(isLoading)}
          className="space-btn space-btn-primary border-0 shrink-0"
          aria-label="Submit search"
        >
          {isLoading ? 'Scanning…' : 'Search'}
        </button>
      </form>

      <div className="search-suite__meta">
        <label htmlFor="search-mode" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Search Mode:
        </label>
        <select
          id="search-mode"
          value={searchType}
          onChange={(e) => onSearchTypeChange?.(e.target.value as 'keyword' | 'semantic')}
          className="space-input text-sm py-2 px-3"
          style={{ 
            backgroundColor: 'var(--space-mid)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
          }}
        >
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
        <button
          type="button"
          onClick={() => router.push('/projects/unknown')}
          className="ml-3 space-btn space-btn-ghost"
          aria-label="Open mission data"
        >
          Mission Data
        </button>
        <span className="search-suite__meta-copy">
          {searchType === 'semantic' 
            ? 'Meaning-based search (slower, better for intent)' 
            : 'Keyword matching (faster, precise)'}
        </span>
      </div>
    </div>
  )
}
