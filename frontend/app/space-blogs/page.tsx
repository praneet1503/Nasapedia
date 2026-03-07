'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import LoadingState from '../../components/LoadingState'
import LoadMoreButton from '../../components/news/LoadMoreButton'
import NewsGrid from '../../components/news/NewsGrid'
import SectionHeader from '../../components/news/SectionHeader'
import { useSpaceArticles, useSpaceBlogs } from '../../hooks/useSpaceContent'
import { recordSpaceClick } from '../../lib/visitor'
import type { SpaceContentItem } from '../../lib/types'

const PAGE_SIZE = 20

function useAccumulatedItems(data: { items: SpaceContentItem[] } | undefined) {
  const [items, setItems] = useState<SpaceContentItem[]>([])
  const mergedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!data?.items?.length) return
    const newItems = data.items.filter((item) => !mergedRef.current.has(item.id))
    if (newItems.length > 0) {
      for (const item of newItems) mergedRef.current.add(item.id)
      setItems((prev) => [...prev, ...newItems])
    }
  }, [data])

  return items
}

export default function SpaceBlogsPage() {
  // Blog section state
  const [blogOffset, setBlogOffset] = useState(0)
  const blogLoadingRef = useRef(false)
  const blogsQuery = useSpaceBlogs(blogOffset, PAGE_SIZE)
  const blogItems = useAccumulatedItems(blogsQuery.data)
  const blogHasMore = blogsQuery.data?.next != null

  // Article section state
  const [articleOffset, setArticleOffset] = useState(0)
  const articleLoadingRef = useRef(false)
  const articlesQuery = useSpaceArticles(articleOffset, PAGE_SIZE)
  const articleItems = useAccumulatedItems(articlesQuery.data)
  const articleHasMore = articlesQuery.data?.next != null

  const handleLoadMoreBlogs = useCallback(() => {
    if (blogLoadingRef.current || !blogHasMore) return
    blogLoadingRef.current = true
    setBlogOffset((prev) => prev + PAGE_SIZE)
  }, [blogHasMore])

  const handleLoadMoreArticles = useCallback(() => {
    if (articleLoadingRef.current || !articleHasMore) return
    articleLoadingRef.current = true
    setArticleOffset((prev) => prev + PAGE_SIZE)
  }, [articleHasMore])

  const handleItemClick = useCallback((id: number, type: 'article' | 'blog') => {
    recordSpaceClick(id, type)
  }, [])

  // Reset loading refs when data arrives
  useEffect(() => { blogLoadingRef.current = false }, [blogsQuery.data])
  useEffect(() => { articleLoadingRef.current = false }, [articlesQuery.data])

  const isFirstLoad =
    (blogsQuery.isLoading && blogItems.length === 0) ||
    (articlesQuery.isLoading && articleItems.length === 0)

  const hasError = blogsQuery.isError && articlesQuery.isError

  return (
    <main className="page-shell pt-10">
      <section className="page-section">
        {hasError ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
            }}
          >
            Space news temporarily unavailable.
          </div>
        ) : null}

        {isFirstLoad ? (
          <LoadingState label="Receiving space blogs telemetry…" />
        ) : (
          <div className="space-y-10">
            {/* Section 1: Blogs */}
            {blogItems.length > 0 || !blogsQuery.isError ? (
              <div className="space-y-5">
                <SectionHeader
                  title="Latest Blogs"
                  subtitle={`Showing ${blogItems.length} blogs`}
                  icon="📝"
                />
                <NewsGrid
                  items={blogItems}
                  onItemClick={handleItemClick}
                  contentType="blog"
                  isStale={blogsQuery.isPlaceholderData}
                />
                <LoadMoreButton
                  onClick={handleLoadMoreBlogs}
                  isLoading={blogsQuery.isLoading && blogItems.length > 0}
                  hasMore={blogHasMore}
                />
              </div>
            ) : null}

            {/* Section 2: Articles */}
            {articleItems.length > 0 || !articlesQuery.isError ? (
              <div className="space-y-5">
                <SectionHeader
                  title="Latest Articles"
                  subtitle={`Showing ${articleItems.length} articles`}
                  icon="🛰️"
                />
                <NewsGrid
                  items={articleItems}
                  onItemClick={handleItemClick}
                  contentType="article"
                  isStale={articlesQuery.isPlaceholderData}
                />
                <LoadMoreButton
                  onClick={handleLoadMoreArticles}
                  isLoading={articlesQuery.isLoading && articleItems.length > 0}
                  hasMore={articleHasMore}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
