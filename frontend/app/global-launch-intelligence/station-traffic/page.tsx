'use client'

import { useStationTraffic } from '../../../hooks/useIntelligence'
import { IntelCard, Metric, IndexGauge, IntelSkeleton, IntelError } from '../../../components/intelligence/IntelComponents'

export default function StationTrafficPage() {
  const { data, isLoading, error, refetch } = useStationTraffic()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Station Traffic</h2>
        <IntelSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data) {
    return <IntelError message={error?.message || 'Failed to load station data'} onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
        Space Station Traffic Monitor
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IntelCard title="Active Stations" status="nominal">
          <Metric label="Orbiting" value={data.active_stations.length} size="lg" />
        </IntelCard>
        <IntelCard title="Total Stations" status="info">
          <Metric label="All tracked" value={data.total_stations} size="lg" />
        </IntelCard>
        <IntelCard title="Docked Vehicles" status="info">
          <Metric label="Currently attached" value={data.total_docked_vehicles} size="lg" />
        </IntelCard>
        <IntelCard title="Traffic Density">
          <IndexGauge label="Density Index" value={data.traffic_density_index} icon="⬡" />
        </IntelCard>
      </div>

      {/* Station Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.all_stations.map((station) => (
          <IntelCard
            key={station.name}
            title={station.name}
            status={station.status.toLowerCase() === 'active' ? 'nominal' : 'warning'}
            subtitle={station.status}
          >
            <div className="space-y-3 mt-2">
              {/* Station Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Orbit</span>
                  <p className="text-xs text-[var(--text-primary)]">{station.orbit}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Founded</span>
                  <p className="text-xs text-[var(--text-primary)]">{station.founded || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Owners</span>
                  <p className="text-xs text-[var(--text-primary)]">{station.owners.join(', ') || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Docked</span>
                  <p className="text-xs font-mono text-[var(--accent)]">{station.docked_count} vehicles</p>
                </div>
              </div>

              {/* Docked Vehicles */}
              {station.docked_vehicles.length > 0 && (
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Docked Spacecraft</span>
                  <div className="mt-1 space-y-1">
                    {station.docked_vehicles.map((vehicle, vIndex) => (
                      <div key={vIndex} className="flex items-center justify-between py-1 px-2 rounded bg-[var(--space-deep)] border border-[var(--border)]/50">
                        <span className="text-[11px] text-[var(--text-primary)]">{vehicle.name}</span>
                        <div className="flex gap-2">
                          {vehicle.docking_date && (
                            <span className="text-[9px] text-[var(--text-muted)]">
                              Docked: {new Date(vehicle.docking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Station Image */}
              {station.image_url && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)]/50 h-32">
                  <img src={station.image_url} alt={station.name} className="w-full h-full object-cover opacity-70" />
                </div>
              )}
            </div>
          </IntelCard>
        ))}
      </div>
    </div>
  )
}
