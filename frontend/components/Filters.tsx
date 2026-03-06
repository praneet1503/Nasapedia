'use client'

type FiltersProps = {
  trlMin: string
  trlMax: string
  organization: string
  technologyArea: string
  onChange: (next: {
    trlMin?: string
    trlMax?: string
    organization?: string
    technologyArea?: string
  }) => void
}

export default function Filters({
  trlMin,
  trlMax,
  organization,
  technologyArea,
  onChange,
}: FiltersProps) {
  return (
    <div className="filter-grid">
      <div className="filter-field">
        <label className="filter-label">TRL min</label>
        <input
          inputMode="numeric"
          value={trlMin}
          onChange={(e) => onChange({ trlMin: e.target.value })}
          placeholder="e.g. 1"
          className="space-input mt-1 w-full"
        />
      </div>

      <div className="filter-field">
        <label className="filter-label">TRL max</label>
        <input
          inputMode="numeric"
          value={trlMax}
          onChange={(e) => onChange({ trlMax: e.target.value })}
          placeholder="e.g. 9"
          className="space-input mt-1 w-full"
        />
      </div>

      <div className="filter-field">
        <label className="filter-label">Organization</label>
        <input
          value={organization}
          onChange={(e) => onChange({ organization: e.target.value })}
          placeholder="e.g. JPL"
          className="space-input mt-1 w-full"
        />
      </div>

      <div className="filter-field">
        <label className="filter-label">Technology area</label>
        <input
          value={technologyArea}
          onChange={(e) => onChange({ technologyArea: e.target.value })}
          placeholder="e.g. Robotics"
          className="space-input mt-1 w-full"
        />
      </div>
    </div>
  )
}

