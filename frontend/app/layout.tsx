import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import StarField from '../components/StarField'
import TopNav from '../components/TopNav'
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
        <TopNav />
        <Providers>
          <div className="relative z-10 pt-14 pb-10">{children}</div>
          <Analytics />
        </Providers>
        <footer className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center py-2 px-4 bg-[var(--space-void)]/80 backdrop-blur-sm border-t border-white/10 text-xs text-[var(--text-secondary)]">
          <span>
            project made by praneet&nbsp;|&nbsp;
            <a href="https://github.com/praneet1503/Nasapedia" className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">it is open sourced</a>
            &nbsp;|&nbsp;made with love of space and data.......
          </span>
        </footer>
      </body>
    </html>
  )
}

