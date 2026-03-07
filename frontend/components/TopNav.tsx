'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/global-launch-intelligence/dashboard', label: 'COMMAND CENTER', match: (pathname: string) => pathname === '/' || pathname.startsWith('/global-launch-intelligence') },
  { href: '/projects', label: 'PROJECT ATLAS', match: (pathname: string) => pathname === '/projects' || pathname.startsWith('/project/') },
  { href: '/feed', label: 'ADAPTIVE FEED', match: (pathname: string) => pathname.startsWith('/feed') },
  { href: '/space-news', label: 'SPACE NEWS', match: (pathname: string) => pathname.startsWith('/space-news') },
  { href: '/space-blogs', label: 'ARTICLES & BLOGS', match: (pathname: string) => pathname.startsWith('/space-blogs') },
  { href: '/iss-tracker', label: 'ISS TRACKER', match: (pathname: string) => pathname.startsWith('/iss-tracker') },
]

function getSectionLabel(pathname: string): string {
  if (pathname.startsWith('/global-launch-intelligence')) return 'GLOBAL LAUNCH INTELLIGENCE'
  if (pathname === '/projects' || pathname.startsWith('/project/')) return 'MISSION ATLAS'
  if (pathname.startsWith('/feed')) return 'ADAPTIVE FEED'
  if (pathname.startsWith('/space-news')) return 'NEWS'
  if (pathname.startsWith('/space-blogs')) return 'BLOGS'
  if (pathname.startsWith('/iss-tracker')) return 'ISS TRACKER'
  return 'GLOBAL LAUNCH INTELLIGENCE'
}

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
    <span
      className="global-topbar-clock font-mono text-[11px] tracking-[0.12em] text-red-400"
      style={{ textShadow: '0 0 6px rgba(255,30,30,0.5)' }}
    >
      {time}
    </span>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const sectionLabel = getSectionLabel(pathname)

  return (
    <header className="global-topbar">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/global-launch-intelligence/dashboard" className="intel-brand-link">
          NASAPEDIA
        </Link>
        <span className="global-topbar-separator" aria-hidden="true">|</span>
        <h1 className="global-topbar-title">{sectionLabel}</h1>
      </div>

      <div className="flex items-center gap-4 min-w-0">
        <nav className="global-topbar-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`global-topbar-link ${isActive ? 'global-topbar-link-active' : ''}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <MissionClock />
      </div>
    </header>
  )
}
