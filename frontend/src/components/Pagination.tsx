import { memo, useMemo } from 'react'

export const Pagination = memo(function Pagination(props: {
  page: number
  pageSize: number
  total: number
  onPageChange: (next: number) => void
}) {
  const { page, pageSize, total, onPageChange } = props

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const pages = useMemo(() => {
    // keep it simple like screenshot: show first 2 pages (expand later if needed)
    const out: number[] = []
    for (let i = 1; i <= totalPages; i++) {
      out.push(i)
      if (i >= 2) break
    }
    return out
  }, [totalPages])

  return (
    <div className="ts-pagination">
      <button type="button" className="ts-page-btn" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`ts-page-btn ${p === safePage ? 'is-active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" className="ts-page-btn" disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>
        Next
      </button>
    </div>
  )
})

