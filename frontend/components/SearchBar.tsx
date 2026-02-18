'use client'

import { useRef, useState } from 'react'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  // Allow Enter key to submit immediately (override debounce)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="space-y-3">
      <form
        className="flex w-full gap-2"
        onSubmit={handleSubmit}
      >
        <div className="relative w-full">
          {/* Search icon */}
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
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search NASA missions & projects…"
            className="space-input w-full pl-10 pr-10"
            aria-label="Search projects"
            aria-live="polite"
          />
          {/* Loading indicator */}
          {isLoading && (
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--accent)' }}
            >
              <path d="M12 2v4m0 12v4M19.07 4.93l-2.83 2.83m-8.48 8.48l-2.83 2.83M20 12h4M4 12H0m16.07 4.07l2.83 2.83m-8.48-8.48L4.93 4.93" />
            </svg>
          )}
        </div>
        <button
          type="submit"
          disabled={Boolean(isLoading)}
          className="space-btn space-btn-primary shrink-0"
          aria-label="Submit search"
        >
          {isLoading ? 'Scanning…' : '🔍 Search'}
        </button>
      </form>

      {/* Search mode selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="search-mode" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Search Mode:
        </label>
        <select
          id="search-mode"
          value={searchType}
          onChange={(e) => onSearchTypeChange?.(e.target.value as 'keyword' | 'semantic')}
          className="space-input text-sm py-2 px-3"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}
        >
          <option value="keyword">⚡ Fast (Keyword)</option>
          <option value="semantic">🧠 Smart (Semantic)</option>
        </select>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {searchType === 'semantic' 
            ? 'Meaning-based search (slower, better for intent)' 
            : 'Keyword matching (faster, precise)'}
        </span>
      </div>
    </div>
  )
}
