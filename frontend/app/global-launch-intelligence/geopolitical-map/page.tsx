'use client'

import { useGeopoliticalData } from '../../../hooks/useIntelligence'
import { IntelCard, Metric, StatusBadge, AlertBanner, IntelSkeleton, IntelError } from '../../../components/intelligence/IntelComponents'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const BAR_COLORS = ['#00d4ff', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16']

export default function GeopoliticalMapPage() {
  const { data, isLoading, error, refetch } = useGeopoliticalData()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Geopolitical Map</h2>
        <IntelSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load geopolitical data'} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      {data.regional_spikes.length > 0 && (
        <AlertBanner
          type="surge"
          message={`REGIONAL ACTIVITY SPIKES: ${data.regional_spikes.map(s => `${s.country} (+${Math.round(((s.recent - s.previous) / Math.max(s.previous, 1)) * 100)}%)`).join(', ')}`}
        />
      )}

      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
        Launch Site Geopolitical Intelligence
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IntelCard title="Active Countries" status="info">
          <Metric label="With launch activity" value={data.total_countries} size="lg" />
        </IntelCard>
        <IntelCard title="Launch Sites" status="info">
          <Metric label="Unique facilities" value={data.total_sites} size="lg" />
        </IntelCard>
        <IntelCard title="Top Country" status="nominal">
          <Metric
            label={data.country_leaderboard[0]?.country || 'N/A'}
            value={data.country_leaderboard[0]?.launches || 0}
            unit="launches"
            size="md"
          />
        </IntelCard>
        <IntelCard title="Regional Spikes" status={data.regional_spikes.length > 0 ? 'warning' : 'nominal'}>
          <Metric label="Detected" value={data.regional_spikes.length} size="lg" />
        </IntelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntelCard title="Launches by Country">
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.country_leaderboard.slice(0, 10)} layout="vertical" barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
                <YAxis
                  dataKey="country"
                  type="category"
                  width={50}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f2e',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="launches" radius={[0, 4, 4, 0]}>
                  {data.country_leaderboard.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IntelCard>

        <IntelCard title="Top Launch Facilities">
          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-1">
            {data.site_leaderboard.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--space-deep)] border border-[var(--border)]/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-[var(--accent)] w-6">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--text-primary)] truncate">{site.name}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{site.country}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[var(--text-primary)] flex-shrink-0 ml-2">
                  {site.total_launches}
                </span>
              </div>
            ))}
          </div>
        </IntelCard>
      </div>

      {data.regional_spikes.length > 0 && (
        <IntelCard title="Regional Activity Spike Analysis">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="intel-th">Country</th>
                  <th className="intel-th">Current Period</th>
                  <th className="intel-th">Previous Period</th>
                  <th className="intel-th">Change</th>
                </tr>
              </thead>
              <tbody>
                {data.regional_spikes.map((spike, i) => {
                  const change = spike.previous > 0
                    ? Math.round(((spike.recent - spike.previous) / spike.previous) * 100)
                    : 100
                  return (
                    <tr key={i} className="border-b border-[var(--border)]/50">
                      <td className="intel-td font-medium">{spike.country}</td>
                      <td className="intel-td font-mono">{spike.recent}</td>
                      <td className="intel-td font-mono">{spike.previous}</td>
                      <td className="intel-td">
                        <StatusBadge label={`+${change}%`} variant="yellow" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </IntelCard>
      )}

      <IntelCard title="Launch Site Coordinates">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="intel-th">Facility</th>
                <th className="intel-th">Country</th>
                <th className="intel-th">Lat</th>
                <th className="intel-th">Lon</th>
                <th className="intel-th">Launches</th>
              </tr>
            </thead>
            <tbody>
              {data.site_leaderboard
                .filter(s => s.latitude != null && s.longitude != null)
                .map((site, i) => {
                  const latNum = Number(site.latitude)
                  const lonNum = Number(site.longitude)
                  const latStr = isNaN(latNum) ? String(site.latitude) : latNum.toFixed(4)
                  const lonStr = isNaN(lonNum) ? String(site.longitude) : lonNum.toFixed(4)
                  return (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--space-elevated)]/50 transition-colors"
                    >
                      <td className="intel-td text-xs">{site.name}</td>
                      <td className="intel-td text-[var(--text-muted)]">
                        {site.country}
                      </td>
                      <td className="intel-td font-mono text-[10px]">{latStr}</td>
                      <td className="intel-td font-mono text-[10px]">{lonStr}</td>
                      <td className="intel-td font-mono">
                        {site.total_launches}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </IntelCard>
    </div>
  )
}
