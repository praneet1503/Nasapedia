'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'

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

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
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
