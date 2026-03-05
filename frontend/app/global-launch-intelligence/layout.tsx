'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState, useEffect } from 'react'

const NAV_ITEMS = [
  { href: '/global-launch-intelligence/dashboard', label: 'COMMAND CENTER', icon: '◆' },
  { href: '/global-launch-intelligence/launch-velocity', label: 'LAUNCH VELOCITY', icon: '▲' },
  { href: '/global-launch-intelligence/agency-dominance', label: 'AGENCY DOMINANCE', icon: '◉' },
  { href: '/global-launch-intelligence/orbital-intelligence', label: 'ORBITAL INTEL', icon: '◎' },
  { href: '/global-launch-intelligence/mission-classification', label: 'MISSION CLASS', icon: '▣' },
  { href: '/global-launch-intelligence/astronaut-activity', label: 'ASTRONAUT OPS', icon: '☆' },
  { href: '/global-launch-intelligence/station-traffic', label: 'STATION TRAFFIC', icon: '⬡' },
  { href: '/global-launch-intelligence/geopolitical-map', label: 'GEO MAP', icon: '⊕' },
]

function MissionClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-[11px] tracking-[0.12em] text-red-400"
      style={{ textShadow: '0 0 6px rgba(255,30,30,0.5)' }}>
      {time}
    </span>
  )
}

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="intel-topbar">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-xs">
            ← NASAPEDIA
          </Link>
          <div className="w-px h-4 bg-[var(--border)]" />
          <h1 className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)]">
            Global Launch Intelligence
          </h1>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <MissionClock />
        </div>
      </header>

      <div className="flex flex-1">
        <nav className={`intel-sidebar ${collapsed ? 'intel-sidebar-collapsed' : ''}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full text-left px-3 py-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] uppercase tracking-wider transition-colors"
          >
            {collapsed ? '▸' : '▾ MODULES'}
          </button>

          {!collapsed && NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`intel-nav-item ${isActive ? 'intel-nav-active' : ''}`}
              >
                <span className="text-xs w-4 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <main
          className="flex-1 p-4 md:p-6 overflow-auto"
          style={{ marginLeft: collapsed ? 52 : 220 }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
