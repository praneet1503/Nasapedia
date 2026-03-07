'use client'

import { useOrbitalIntelligence } from '../../../hooks/useIntelligence'
import { IntelCard, Metric, StatusBadge, AlertBanner, IntelSkeleton, IntelError } from '../../../components/intelligence/IntelComponents'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const ORBIT_COLORS: Record<string, string> = {
  LEO: '#f2c40d',
  MEO: '#c58b2f',
  GEO: '#f59e0b',
  'Deep Space': '#ef4444',
  Other: '#64748b',
}

const USAGE_COLORS: Record<string, string> = {
  Military: '#ef4444',
  Commercial: '#f2c40d',
  Civilian: '#22c55e',
}

export default function OrbitalIntelligencePage() {
  const { data, isLoading, error, refetch } = useOrbitalIntelligence()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Orbital Intelligence</h2>
        <IntelSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load orbital data'} onRetry={() => refetch()} />
  }

  const orbitPieData = Object.entries(data.distribution).map(([key, val]) => ({
    name: key,
    value: val.count,
    fill: ORBIT_COLORS[key] || '#64748b',
  }))

  const usagePieData = Object.entries(data.usage_split).map(([key, val]) => ({
    name: key,
    value: val.count,
    fill: USAGE_COLORS[key] || '#64748b',
  }))

  const orbitBarData = Object.entries(data.distribution).map(([key, val]) => ({
    orbit: key,
    count: val.count,
    percent: val.percent,
  }))

  return (
    <div className="space-y-4">
      {data.telecom_expansion_flag && (
        <AlertBanner type="expansion" message={`TELECOM EXPANSION EVENT — GEO traffic spike detected (${data.geo_launches_30d} GEO launches in 30 days)`} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Orbital Intelligence Mapping
        </h2>
        <StatusBadge
          label={data.telecom_expansion_flag ? 'GEO SPIKE' : 'NOMINAL'}
          variant={data.telecom_expansion_flag ? 'yellow' : 'green'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.distribution).slice(0, 4).map(([orbit, val]) => (
          <IntelCard key={orbit} title={orbit} status="info">
            <Metric label={`${val.percent}% of total`} value={val.count} unit="launches" size="md" />
          </IntelCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntelCard title="Orbital Allocation">
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orbitPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {orbitPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#221e10',
                    border: '1px solid rgba(242,196,13,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {orbitPieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-[10px] text-[var(--text-muted)] uppercase">{d.name}</span>
              </div>
            ))}
          </div>
        </IntelCard>

        <IntelCard title="Strategic Usage Classification">
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usagePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {usagePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#221e10',
                    border: '1px solid rgba(242,196,13,0.2)',
                    borderRadius: '8px',
                    fontSize: 11,
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {usagePieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-[10px] text-[var(--text-muted)] uppercase">{d.name}</span>
              </div>
            ))}
          </div>
        </IntelCard>
      </div>

      <IntelCard title="Orbit Concentration Analysis">
        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orbitBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="orbit" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.12)' }} />
              <Tooltip
                contentStyle={{
                  background: '#221e10',
                  border: '1px solid rgba(242,196,13,0.2)',
                  borderRadius: '8px',
                  fontSize: 11,
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {orbitBarData.map((entry) => (
                  <Cell key={entry.orbit} fill={ORBIT_COLORS[entry.orbit] || '#64748b'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </IntelCard>
    </div>
  )
}
