import type { SpaceContentItem } from '../../lib/types'

type NewsCardProps = {
  item: SpaceContentItem
  onItemClick?: (id: number, type: 'article' | 'blog') => void
  contentType?: 'article' | 'blog'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function NewsCard({ item, onItemClick, contentType = 'article' }: NewsCardProps) {
  const handleClick = () => {
    onItemClick?.(item.id, contentType)
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
      onClick={handleClick}
    >
      <div className="news-card__image-wrap">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            className="news-card__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="news-card__image-placeholder">
            <span aria-hidden="true">🚀</span>
          </div>
        )}
        {item.news_site ? (
          <span className="news-card__source-badge">{item.news_site}</span>
        ) : null}
      </div>

      <div className="news-card__body">
        <h3 className="news-card__title">{item.title}</h3>
        {item.summary ? (
          <p className="news-card__summary">{item.summary}</p>
        ) : null}
        <div className="news-card__footer">
          <time className="news-card__date" dateTime={item.published_at}>
            {formatDate(item.published_at)}
          </time>
          <span className="news-card__cta">Read Full {contentType === 'blog' ? 'Blog' : 'Article'} →</span>
        </div>
      </div>
    </a>
  )
}
