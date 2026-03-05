'use client'

import Link from 'next/link'
import { useFullDashboard } from '../../../hooks/useIntelligence'
import {
  IntelCard, Metric, IndexGauge, StatusBadge, AlertBanner,
  IntelSkeleton, IntelError,
} from '../../../components/intelligence/IntelComponents'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const ORBIT_COLORS: Record<string, string> = {
  LEO: '#00d4ff', MEO: '#a855f7', GEO: '#f59e0b', 'Deep Space': '#ef4444', Other: '#64748b',
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useFullDashboard()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Command Center</h2>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="intel-card"><IntelSkeleton rows={3} /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="intel-card"><IntelSkeleton rows={5} /></div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load dashboard data'} onRetry={() => refetch()} />
  }

  const { velocity, agencies, orbital, missions, astronauts, stations, geopolitics, indices } = data

  const orbitPieData = Object.entries(orbital.distribution).map(([key, val]) => ({
    name: key, value: val.count, fill: ORBIT_COLORS[key] || '#64748b',
  }))

  return (
    <div className="space-y-4">
      {indices.surge_detected && (
        <AlertBanner type="surge" message={`HIGH ACTIVITY PHASE — ${velocity.launches_30d} launches in 30 days`} />
      )}
      {indices.military_escalation && (
        <AlertBanner type="escalation" message={`STRATEGIC ESCALATION — Military missions at ${missions.military_percent_30d}%`} />
      )}
      {indices.telecom_expansion && (
        <AlertBanner type="expansion" message="TELECOM EXPANSION — GEO traffic spike detected" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Command Center
          </h2>
          <StatusBadge label={indices.phase} variant={indices.surge_detected ? 'yellow' : 'green'} />
        </div>
        <button onClick={() => refetch()} className="space-btn text-[10px] px-2 py-1">
          ↻ REFRESH
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <IntelCard title="Space Activity">
          <IndexGauge label="Composite Index" value={indices.space_activity_index} icon="◆" />
        </IntelCard>
        <IntelCard title="Orbital Expansion">
          <IndexGauge label="Expansion Rate" value={indices.orbital_expansion_index} icon="◎" />
        </IntelCard>
        <IntelCard title="Human Spaceflight">
          <IndexGauge label="Crew Activity" value={indices.human_spaceflight_index} icon="☆" />
        </IntelCard>
        <IntelCard title="Military Util.">
          <IndexGauge label="Defense Share" value={indices.military_utilization_index} icon="▣" />
        </IntelCard>
        <IntelCard title="Commercial Exp.">
          <IndexGauge label="Private Sector" value={indices.commercial_expansion_index} icon="◉" />
        </IntelCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/global-launch-intelligence/launch-velocity" className="group">
          <IntelCard title="Launch Velocity" status={velocity.surge_detected ? 'warning' : 'nominal'}
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Metric label="7-Day" value={velocity.launches_7d} size="sm" />
              <Metric label="30-Day" value={velocity.launches_30d} size="sm" />
              <Metric label="Success" value={`${velocity.success_ratio}%`} size="sm" />
              <Metric
                label="Growth"
                value={`${velocity.growth_rate_percent > 0 ? '+' : ''}${velocity.growth_rate_percent}%`}
                size="sm"
                trend={velocity.growth_rate_percent > 0 ? 'up' : velocity.growth_rate_percent < 0 ? 'down' : 'flat'}
              />
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity.daily_timeline}>
                  <defs>
                    <linearGradient id="miniVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="launches" stroke="#00d4ff" strokeWidth={1.5} fill="url(#miniVelocityGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </IntelCard>
        </Link>

        <Link href="/global-launch-intelligence/agency-dominance" className="group">
          <IntelCard title="Agency Dominance" status="nominal"
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Metric label="Total" value={agencies.total_launches} size="sm" />
              <Metric label="Providers" value={agencies.full_leaderboard.length} size="sm" />
              <Metric label="State" value={`${agencies.state_share_percent}%`} size="sm" />
              <Metric label="Private" value={`${agencies.private_share_percent}%`} size="sm" />
            </div>
            <div className="space-y-1.5">
              {agencies.top_5.slice(0, 3).map((a, i) => (
                <div key={a.name} className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[60%]">#{i + 1} {a.name}</span>
                  <span className="text-[10px] font-mono text-[var(--text-primary)]">{a.total_launches}</span>
                </div>
              ))}
            </div>
          </IntelCard>
        </Link>

        <Link href="/global-launch-intelligence/orbital-intelligence" className="group">
          <IntelCard title="Orbital Intel" status={orbital.telecom_expansion_flag ? 'warning' : 'nominal'}
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="h-36 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orbitPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {orbitPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', fontSize: 10, color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </IntelCard>
        </Link>

        <Link href="/global-launch-intelligence/mission-classification" className="group">
          <IntelCard title="Mission Classification" status={missions.military_escalation_flag ? 'critical' : 'nominal'}
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Metric label="Categories" value={missions.categories.length} size="sm" />
              <Metric label="Military %" value={`${missions.military_percent_30d}%`} size="sm" />
            </div>
            <div className="space-y-1">
              {missions.categories.slice(0, 4).map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[65%]">{c.name}</span>
                  <span className="text-[10px] font-mono text-[var(--text-primary)]">{c.total}</span>
                </div>
              ))}
            </div>
          </IntelCard>
        </Link>

        <Link href="/global-launch-intelligence/astronaut-activity" className="group">
          <IntelCard title="Astronaut Ops" status="nominal"
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Metric label="Active" value={astronauts.total_active} size="sm" />
              <Metric label="Crewed Missions" value={astronauts.upcoming_crewed_missions.length} size="sm" />
            </div>
            <IndexGauge label="Activity Index" value={astronauts.human_activity_index} icon="☆" />
          </IntelCard>
        </Link>

        <Link href="/global-launch-intelligence/station-traffic" className="group">
          <IntelCard title="Station Traffic" status="nominal"
            headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Metric label="Stations" value={stations.total_stations} size="sm" />
              <Metric label="Docked" value={stations.total_docked_vehicles} size="sm" />
            </div>
            <IndexGauge label="Traffic Density" value={stations.traffic_density_index} icon="⬡" />
          </IntelCard>
        </Link>
      </div>

      <Link href="/global-launch-intelligence/geopolitical-map" className="group block">
        <IntelCard title="Geopolitical Overview" status="info"
          headerRight={<span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">DRILL DOWN →</span>}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Countries" value={geopolitics.total_countries} size="sm" />
            <Metric label="Sites" value={geopolitics.total_sites} size="sm" />
            <Metric label="Regional Spikes" value={geopolitics.regional_spikes.length} size="sm" />
            <Metric label="Top Country" value={geopolitics.country_leaderboard[0]?.country || 'N/A'} size="sm" />
          </div>
        </IntelCard>
      </Link>
    </div>
  )
}
