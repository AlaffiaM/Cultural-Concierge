export default function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="pagination-bar">
      <span className="pagination-info">Showing {from}–{to} of {total}</span>
      <div className="pagination-controls">
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {start > 1 && <><button className="pagination-btn" onClick={() => onPageChange(1)}>1</button><span className="pagination-ellipsis">…</span></>}
        {pages.map(p => <button key={p} className={`pagination-btn ${p === page ? 'pagination-active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>)}
        {end < totalPages && <><span className="pagination-ellipsis">…</span><button className="pagination-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </div>
  )
}
