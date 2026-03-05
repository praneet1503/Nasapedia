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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div>
        <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>TRL min</label>
        <input
          inputMode="numeric"
          value={trlMin}
          onChange={(e) => onChange({ trlMin: e.target.value })}
          placeholder="e.g. 1"
          className="space-input mt-1 w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>TRL max</label>
        <input
          inputMode="numeric"
          value={trlMax}
          onChange={(e) => onChange({ trlMax: e.target.value })}
          placeholder="e.g. 9"
          className="space-input mt-1 w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Organization</label>
        <input
          value={organization}
          onChange={(e) => onChange({ organization: e.target.value })}
          placeholder="e.g. JPL"
          className="space-input mt-1 w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Technology area</label>
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

