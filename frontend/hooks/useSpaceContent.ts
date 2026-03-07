import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchSpaceArticles, fetchSpaceBlogs } from '../lib/space-api'
import type { SpaceContentResponse } from '../lib/types'

export function useSpaceArticles(offset: number, limit: number = 20) {
  return useQuery<SpaceContentResponse, Error>({
    queryKey: ['space-articles', offset, limit],
    queryFn: () => fetchSpaceArticles(limit, offset),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSpaceBlogs(offset: number, limit: number = 20) {
  return useQuery<SpaceContentResponse, Error>({
    queryKey: ['space-blogs', offset, limit],
    queryFn: () => fetchSpaceBlogs(limit, offset),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
