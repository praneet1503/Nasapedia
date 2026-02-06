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
        <label className="block text-xs font-medium text-slate-700">TRL min</label>
        <input
          inputMode="numeric"
          value={trlMin}
          onChange={(e) => onChange({ trlMin: e.target.value })}
          placeholder="e.g. 1"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">TRL max</label>
        <input
          inputMode="numeric"
          value={trlMax}
          onChange={(e) => onChange({ trlMax: e.target.value })}
          placeholder="e.g. 9"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">Organization</label>
        <input
          value={organization}
          onChange={(e) => onChange({ organization: e.target.value })}
          placeholder="e.g. JPL"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">Technology area</label>
        <input
          value={technologyArea}
          onChange={(e) => onChange({ technologyArea: e.target.value })}
          placeholder="e.g. Robotics"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>
    </div>
  )
}
