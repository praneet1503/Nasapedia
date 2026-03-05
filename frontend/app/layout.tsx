import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import StarField from '../components/StarField'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'Nasapedia',
  description: 'Search and explore Nasapedia projects',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--space-void)] text-[var(--text-primary)] antialiased">
        <StarField />
        <Providers>
          <div className="relative z-10">{children}</div>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}

