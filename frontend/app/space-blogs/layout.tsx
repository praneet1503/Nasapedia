import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Space Blogs and Articles | NASAPEDIA',
  description: 'Expert blogs and analysis about space exploration and astronomy.',
}

export default function SpaceBlogsLayout({ children }: { children: React.ReactNode }) {
  return children
}
