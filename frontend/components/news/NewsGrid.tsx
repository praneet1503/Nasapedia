import type { SpaceContentItem } from '../../lib/types'
import NewsCard from './NewsCard'

type NewsGridProps = {
  items: SpaceContentItem[]
  onItemClick?: (id: number, type: 'article' | 'blog') => void
  contentType?: 'article' | 'blog'
  isStale?: boolean
}

export default function NewsGrid({ items, onItemClick, contentType = 'article', isStale = false }: NewsGridProps) {
  if (items.length === 0) {
    return (
      <div className="surface-panel surface-panel--empty text-center">
        <span className="text-3xl">🌌</span>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No {contentType === 'blog' ? 'blogs' : 'articles'} found in this sector.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`news-grid transition-opacity duration-200 ${isStale ? 'opacity-50' : 'opacity-100'}`}
    >
      {items.map((item) => (
        <NewsCard
          key={item.id}
          item={item}
          onItemClick={onItemClick}
          contentType={contentType}
        />
      ))}
    </div>
  )
}
