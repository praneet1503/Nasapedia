import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'NASA TechPort Explorer',
  description: 'Search and explore NASA TechPort projects',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
