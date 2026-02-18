'use client'

type SearchBarProps = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading?: boolean
}

export default function SearchBar({ value, onChange, onSubmit, isLoading }: SearchBarProps) {
  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search NASA missions & projects…"
          className="space-input w-full pl-10"
        />
      </div>
      <button
        type="submit"
        disabled={Boolean(isLoading)}
        className="space-btn space-btn-primary shrink-0"
      >
        {isLoading ? 'Scanning…' : '🔍 Search'}
      </button>
    </form>
  )
}
