import { useCallback, useEffect, useRef, useState } from 'react'
export interface UseSearchOptions<T> {
  query: string
  debounceMs?: number
  minChars?: number
  onSearch: (query: string) => Promise<T>
}

export interface UseSearchResult<T> {
  results: T | null
  isLoading: boolean
  error: Error | null
  lastQuery: string
}

export function useSearch<T>({
  query,
  debounceMs = 300,
  minChars = 2,
  onSearch,
}: UseSearchOptions<T>): UseSearchResult<T> {
  const [results, setResults] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastQuery, setLastQuery] = useState('')

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      setResults(null)
      setError(null)
      setLastQuery(searchQuery)

      if (searchQuery.trim().length < minChars) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        const data = await onSearch(searchQuery)

        if (!signal.aborted) {
          setResults(data)
          setError(null)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setError(err instanceof Error ? err : new Error('Search failed'))
        setResults(null)
      } finally {
        setIsLoading(false)
      }
    },
    [minChars, onSearch]
  )

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      executeSearch(query)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, debounceMs, executeSearch])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    results,
    isLoading,
    error,
    lastQuery,
  }
}
