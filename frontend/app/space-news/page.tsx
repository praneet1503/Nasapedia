'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import LoadingState from '../../components/LoadingState'
import TopNav from '../../components/TopNav'
import LoadMoreButton from '../../components/news/LoadMoreButton'
import NewsGrid from '../../components/news/NewsGrid'
import SectionHeader from '../../components/news/SectionHeader'
import { useSpaceArticles } from '../../hooks/useSpaceContent'
import { recordSpaceClick } from '../../lib/visitor'
import type { SpaceContentItem } from '../../lib/types'

const PAGE_SIZE = 20

export default function SpaceNewsPage() {
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<SpaceContentItem[]>([])
  const loadingRef = useRef(false)
  const mergedRef = useRef<Set<number>>(new Set())

  const { data, isLoading, isError, isPlaceholderData } = useSpaceArticles(offset, PAGE_SIZE)
  const hasMore = data?.next != null

  // Merge new items when data changes
  useEffect(() => {
    if (!data?.items?.length) return
    const newItems = data.items.filter((item) => !mergedRef.current.has(item.id))
    if (newItems.length > 0) {
      for (const item of newItems) mergedRef.current.add(item.id)
      setItems((prev) => [...prev, ...newItems])
    }
    loadingRef.current = false
  }, [data])

  const handleLoadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setOffset((prev) => prev + PAGE_SIZE)
  }, [hasMore])

  const handleItemClick = useCallback((id: number, type: 'article' | 'blog') => {
    recordSpaceClick(id, type)
  }, [])

  return (
    <main className="page-shell">
      <header className="page-hero page-hero--news">
        <div className="page-hero__copy">
          <div className="page-eyebrow">
            Space News
            <span className="page-eyebrow__tag">Live feed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">📡</span>
            <h1 className="page-title">Latest Space News</h1>
          </div>
          <p className="page-subtitle">
            Latest updates about space missions, discoveries, and launches from trusted sources worldwide.
          </p>
        </div>

        <div className="page-hero__rail">
          <TopNav />
          <div className="page-hero__stats">
            <div className="page-stat">
              <span className="page-stat__label">Articles loaded</span>
              <strong className="page-stat__value">{items.length || '—'}</strong>
              <span className="page-stat__hint">from global sources</span>
            </div>
            <div className="page-stat">
              <span className="page-stat__label">Update cycle</span>
              <strong className="page-stat__value">1 hr</strong>
              <span className="page-stat__hint">server-side cache window</span>
            </div>
          </div>
        </div>
      </header>

      <section className="page-section">
        {isError ? (
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

        {isLoading && items.length === 0 ? (
          <LoadingState label="Receiving space news telemetry…" />
        ) : (
          <>
            {items.length > 0 ? (
              <div className="space-y-5">
                <SectionHeader
                  title="Latest Articles"
                  subtitle={`Showing ${items.length} articles`}
                  icon="🛰️"
                />
                <NewsGrid
                  items={items}
                  onItemClick={handleItemClick}
                  contentType="article"
                  isStale={isPlaceholderData}
                />
                <LoadMoreButton
                  onClick={handleLoadMore}
                  isLoading={isLoading && items.length > 0}
                  hasMore={hasMore}
                />
              </div>
            ) : null}

            {!isLoading && items.length === 0 && !isError ? (
              <div className="surface-panel surface-panel--empty text-center">
                <span className="text-3xl">🌌</span>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No space news available right now.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
