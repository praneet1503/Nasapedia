'use client'

import { useMissionClassification } from '../../../hooks/useIntelligence'
import { IntelCard, Metric, StatusBadge, AlertBanner, IntelSkeleton, IntelError } from '../../../components/intelligence/IntelComponents'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Treemap,
} from 'recharts'

const CATEGORY_COLORS = [
  '#f2c40d', '#c58b2f', '#f59e0b', '#22c55e', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
]

export default function MissionClassificationPage() {
  const { data, isLoading, error, refetch } = useMissionClassification()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Mission Classification</h2>
        <IntelSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load mission data'} onRetry={() => refetch()} />
  }

  const barData = data.categories.slice(0, 10)

  const treemapData = data.categories.filter(c => c.total > 0).map((c, i) => ({
    name: c.name,
    size: c.total,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  return (
    <div className="space-y-4">
      {data.military_escalation_flag && (
        <AlertBanner type="escalation" message={`STRATEGIC ESCALATION INDICATOR — Military missions at ${data.military_percent_30d}% (>25% threshold) in past 30 days`} />
      )}
      {data.emerging_categories.length > 0 && (
        <AlertBanner type="info" message={`EMERGING CATEGORIES: ${data.emerging_categories.join(', ')}`} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Mission Classification Intelligence
        </h2>
        {data.military_escalation_flag && (
          <StatusBadge label="ESCALATION" variant="red" />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IntelCard title="Total Classified" status="info">
          <Metric label="All missions" value={data.total_classified} size="lg" />
        </IntelCard>
        <IntelCard title="Categories">
          <Metric label="Unique types" value={data.categories.length} size="lg" />
        </IntelCard>
        <IntelCard title="Military %" status={data.military_escalation_flag ? 'critical' : undefined}>
          <Metric label="30-day share" value={`${data.military_percent_30d}%`} size="lg" />
        </IntelCard>
        <IntelCard title="Emerging" status={data.emerging_categories.length > 0 ? 'warning' : undefined}>
          <Metric label="Trending categories" value={data.emerging_categories.length} size="lg" />
        </IntelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntelCard title="Mission Type Distribution" className="lg:col-span-1">
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#221e10',
                    border: '1px solid rgba(242,196,13,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IntelCard>

        <IntelCard title="30-Day Category Activity" className="lg:col-span-1">
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#221e10',
                    border: '1px solid rgba(242,196,13,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="recent_30d" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} fillOpacity={0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IntelCard>
      </div>

      <IntelCard title="Category Intelligence Table">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="intel-th">Category</th>
                <th className="intel-th">Total</th>
                <th className="intel-th">Share %</th>
                <th className="intel-th">30-Day</th>
                <th className="intel-th">30-Day %</th>
                <th className="intel-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat, i) => {
                const isEmerging = data.emerging_categories.includes(cat.name)
                return (
                  <tr key={cat.name} className="border-b border-[var(--border)]/50 hover:bg-[var(--space-elevated)]/50 transition-colors">
                    <td className="intel-td">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      {cat.name}
                    </td>
                    <td className="intel-td font-mono">{cat.total}</td>
                    <td className="intel-td font-mono">{cat.percent}%</td>
                    <td className="intel-td font-mono">{cat.recent_30d}</td>
                    <td className="intel-td font-mono">{cat.recent_percent}%</td>
                    <td className="intel-td">
                      {isEmerging && <StatusBadge label="EMERGING" variant="yellow" />}
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
