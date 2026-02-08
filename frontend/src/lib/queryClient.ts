import { QueryClient } from '@tanstack/react-query'

const TEN_MINUTES = 10 * 60 * 1000
const THIRTY_MINUTES = 30 * 60 * 1000

export const QUERY_CACHE_PERSIST_KEY = 'nasa-techport-query-cache'
export const QUERY_CACHE_MAX_AGE_MS = THIRTY_MINUTES

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: TEN_MINUTES,
      // React Query v5 uses gcTime (cacheTime in v4) to control memory retention.
      gcTime: THIRTY_MINUTES,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // When true, stale queries refetch on every mount/route change; keep false to prevent loops.
      refetchOnMount: false,
      retry: 1,
      suspense: false,
    },
  },
})
