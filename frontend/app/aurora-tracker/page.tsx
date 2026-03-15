'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

import { useAuroraData } from '../../hooks/useAuroraData'

type RegionRule = {
  region: string
  minKp: number
}

const AuroraMap = dynamic(() => import('../../components/AuroraMap'), { ssr: false })

const REGION_RULES: RegionRule[] = [
  { region: 'Arctic Circle', minKp: 2 },
  { region: 'Northern Europe', minKp: 4 },
  { region: 'Northern U.S. / Southern Canada', minKp: 5 },
  { region: 'Southern Australia / New Zealand', minKp: 6 },
]

function formatTimestamp(value: string | null): string {
  if (!value) return 'N/A'
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function classifyChance(kp: number, minKp: number): { label: string; percent: number } {
  const delta = kp - minKp
  if (delta >= 2) return { label: 'Very High', percent: 88 }
  if (delta >= 1) return { label: 'High', percent: 70 }
  if (delta >= 0) return { label: 'Moderate', percent: 48 }
  if (delta >= -1) return { label: 'Low', percent: 24 }
  return { label: 'Very Low', percent: 10 }
}

function kpState(kp: number): { label: string; color: string } {
  if (kp >= 7) return { label: 'Storm', color: '#fb7185' }
  if (kp >= 5) return { label: 'Active', color: '#f59e0b' }
  if (kp >= 3) return { label: 'Unsettled', color: '#facc15' }
  return { label: 'Quiet', color: '#34d399' }
}

export default function AuroraTrackerPage() {
  const { data, isLoading, error, refetch } = useAuroraData()
  const [focusSignal, setFocusSignal] = useState(0)

  const currentKp = data?.kp.current_kp ?? 0
  const kpStatus = kpState(currentKp)

  const regions = useMemo(
    () => REGION_RULES.map((rule) => ({ ...rule, ...classifyChance(currentKp, rule.minKp) })),
    [currentKp]
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold font-mono tracking-wide" style={{ color: 'var(--accent)' }}>
            Aurora Tracker
          </h1>
          <p className="mt-2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            NOAA aurora oval + KP index with 2-minute updates
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="space-btn" onClick={() => setFocusSignal((s) => s + 1)}>
            Focus Map
          </button>
          <button type="button" className="space-btn" onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-glass rounded-xl p-6 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading aurora telemetry...
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="space-glass rounded-xl p-6 font-mono text-sm" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          {error.message}
        </div>
      ) : null}

      {!isLoading && !error && data ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-glass rounded-xl p-4">
            <AuroraMap
              northBand={data.oval.north_band}
              southBand={data.oval.south_band}
              focusSignal={focusSignal}
            />
          </div>

          <div className="space-glass rounded-xl p-6">
            <div className="mb-4 rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Current KP Index
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-4xl font-bold font-mono" style={{ color: kpStatus.color }}>
                  {currentKp.toFixed(2)}
                </span>
                <span className="rounded-full border px-2 py-1 text-xs uppercase tracking-[0.12em]" style={{ borderColor: kpStatus.color, color: kpStatus.color }}>
                  {kpStatus.label}
                </span>
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Last observed: {formatTimestamp(data.kp.observed_at)}
              </p>
            </div>

            <div className="mb-4 rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Solar Wind
              </p>
              <p className="mt-2 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                Speed {data.kp.solar_wind.speed_km_s ?? 'N/A'} km/s
                {' | '}
                Density {data.kp.solar_wind.density_cm3 ?? 'N/A'} cm^-3
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Source time: {formatTimestamp(data.kp.solar_wind.observed_at)}
              </p>
            </div>

            <div className="mb-4 rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Regional Chance Heuristic
              </p>
              <div className="mt-3 grid gap-2">
                {regions.map((entry) => (
                  <div key={entry.region} className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em]" style={{ color: 'var(--text-primary)' }}>
                        {entry.region}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        KPI trigger: {entry.minKp.toFixed(0)}+
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono" style={{ color: 'var(--accent-strong)' }}>
                        {entry.percent}%
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {entry.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Oval updated: {formatTimestamp(data.oval.updated_at)} | Forecast: {formatTimestamp(data.oval.forecast_at)}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  )
}
