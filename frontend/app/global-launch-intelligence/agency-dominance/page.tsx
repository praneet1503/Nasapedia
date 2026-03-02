'use client'

import { useState } from 'react'
import { useAgencyDominance } from '../../../hooks/useIntelligence'
import { IntelCard, Metric, StatusBadge, IntelSkeleton, IntelError } from '../../../components/intelligence/IntelComponents'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

const BAR_COLORS = ['#00d4ff', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#6366f1', '#ec4899']

export default function AgencyDominancePage() {
  const [days, setDays] = useState(90)
  const { data, isLoading, error, refetch } = useAgencyDominance(days)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Agency Dominance</h2>
        <IntelSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load agency data'} onRetry={() => refetch()} />
  }

  const pieData = [
    { name: 'State', value: data.state_launches, fill: '#a855f7' },
    { name: 'Private', value: data.private_launches, fill: '#00d4ff' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Agency Dominance Ranking
        </h2>
        <div className="flex items-center gap-2">
          {[30, 60, 90, 180].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-all ${days === d
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IntelCard title="Total Launches" status="info">
          <Metric label={`Past ${data.period_days} days`} value={data.total_launches} size="lg" />
        </IntelCard>
        <IntelCard title="Active Providers" status="nominal">
          <Metric label="Unique agencies" value={data.full_leaderboard.length} size="lg" />
        </IntelCard>
        <IntelCard title="State Share" status="info">
          <Metric label="Government" value={`${data.state_share_percent}%`} size="lg" />
        </IntelCard>
        <IntelCard title="Private Share" status="nominal">
          <Metric label="Commercial" value={`${data.private_share_percent}%`} size="lg" />
        </IntelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 5 Leaderboard */}
        <IntelCard title="Top 5 Launch Providers" className="lg:col-span-2">
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_5} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
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
                  formatter={(value: number, name: string) => {
                    if (name === 'total_launches') return [value, 'Launches']
                    return [value, name]
                  }}
                />
                <Bar dataKey="total_launches" radius={[0, 4, 4, 0]}>
                  {data.top_5.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IntelCard>

        {/* State vs Private Pie */}
        <IntelCard title="State vs Private">
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1a1f2e',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-[10px] text-[var(--text-muted)] uppercase">State {data.state_share_percent}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Private {data.private_share_percent}%</span>
            </div>
          </div>
        </IntelCard>
      </div>

      {/* Full Leaderboard Table */}
      <IntelCard title="Full Provider Leaderboard">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="intel-th">Rank</th>
                <th className="intel-th">Provider</th>
                <th className="intel-th">Launches</th>
                <th className="intel-th">Success Rate</th>
                <th className="intel-th">Type</th>
                <th className="intel-th">Country</th>
              </tr>
            </thead>
            <tbody>
              {data.full_leaderboard.map((agency, i) => (
                <tr key={agency.name} className="border-b border-[var(--border)]/50 hover:bg-[var(--space-elevated)]/50 transition-colors">
                  <td className="intel-td font-mono text-[var(--accent)]">#{i + 1}</td>
                  <td className="intel-td font-medium">{agency.name}</td>
                  <td className="intel-td font-mono">{agency.total_launches}</td>
                  <td className="intel-td">
                    <StatusBadge
                      label={`${agency.success_rate}%`}
                      variant={agency.success_rate >= 90 ? 'green' : agency.success_rate >= 70 ? 'yellow' : 'red'}
                    />
                  </td>
                  <td className="intel-td text-[var(--text-muted)]">{agency.type}</td>
                  <td className="intel-td text-[var(--text-muted)]">{agency.country}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntelCard>
    </div>
  )
}
