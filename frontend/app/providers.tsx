'use client'

import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../src/lib/queryClient'

export default function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// Note: In development, React Strict Mode may mount components twice to surface unsafe effects.
// The singleton QueryClient prevents duplicate caches, but you may still observe double requests in dev only.
