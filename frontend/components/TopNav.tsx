'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: '◆', match: (pathname: string) => pathname === '/' || pathname.startsWith('/global-launch-intelligence') },
  { href: '/projects', label: 'Project Atlas', icon: '◌', match: (pathname: string) => pathname === '/projects' || pathname.startsWith('/project/') },
  { href: '/feed', label: 'Adaptive Feed', icon: '↗', match: (pathname: string) => pathname.startsWith('/feed') },
  { href: '/iss-tracker', label: 'ISS Tracker', icon: '◎', match: (pathname: string) => pathname.startsWith('/iss-tracker') },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="space-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`space-nav-link ${isActive ? 'space-nav-link-active' : ''}`}
          >
            <span className="space-nav-link-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
