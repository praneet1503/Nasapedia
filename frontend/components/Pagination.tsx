import React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const windowSize = 2 // Number of pages valid to show on each side of current page

    if (totalPages <= 7) {
      // If total pages are small, show all of them
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > windowSize + 2) {
        pages.push('...')
      }

      // Calculate start and end of center window
      const start = Math.max(2, currentPage - windowSize)
      const end = Math.min(totalPages - 1, currentPage + windowSize)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - (windowSize + 1)) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="flex items-center justify-center space-x-2 my-8">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="space-btn px-3 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ◀ Prev
      </button>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2" style={{ color: 'var(--text-muted)' }}>
                ···
              </span>
            )
          }

          const isCurrent = page === currentPage
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`min-w-[32px] px-3 py-1 rounded-md text-sm font-medium transition-all ${
                isCurrent
                  ? 'space-btn-primary border-0'
                  : 'space-btn'
              }`}
              style={isCurrent ? { boxShadow: '0 0 14px var(--accent-glow)' } : undefined}
            >
              {page}
            </button>
          )
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="space-btn px-3 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next ▶
      </button>
    </div>
  )
}
