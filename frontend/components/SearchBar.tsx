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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by keyword…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
      <button
        type="submit"
        disabled={Boolean(isLoading)}
        className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Search
      </button>
    </form>
  )
}
