import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Latest Space News | NASAPEDIA',
  description: 'Latest updates about space missions, discoveries, and launches.',
}

export default function SpaceNewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
