type LoadMoreButtonProps = {
  onClick: () => void
  isLoading: boolean
  hasMore: boolean
}

export default function LoadMoreButton({ onClick, isLoading, hasMore }: LoadMoreButtonProps) {
  if (!hasMore) return null

  return (
    <div className="flex justify-center pt-6 pb-2">
      <button
        className="space-btn space-btn-primary load-more-btn"
        onClick={onClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="load-more-spinner" aria-hidden="true" />
            Loading…
          </>
        ) : (
          'Load More'
        )}
      </button>
    </div>
  )
}
