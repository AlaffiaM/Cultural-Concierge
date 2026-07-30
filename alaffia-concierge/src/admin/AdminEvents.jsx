import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import EventEditor from './EventEditor'
import { useConfirm } from './ConfirmModal'

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['All', 'CULTURE', 'WELLNESS', 'SOCIAL']
const PAGE_SIZE = 20

const PILLAR_STYLE = {
  CULTURE: { bg: 'rgba(180,95,45,0.15)', color: '#B45F2D' },
  WELLNESS: { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B' },
  SOCIAL: { bg: 'rgba(91,138,154,0.15)', color: '#5B8A9A' },
}

function PillarBadge({ pillar }) {
  if (!pillar) return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
  const s = PILLAR_STYLE[pillar] || { bg: 'rgba(255,255,255,0.06)', color: '#888' }
  return <span className="pillar-badge" style={{ background: s.bg, color: s.color }}>{pillar}</span>
}

function vibeStyle(vibe) {
  if (!vibe) return null
  const v = vibe.toLowerCase()
  if (/wellness|nature|retreat|active|fitness|spa|yoga/.test(v))
    return { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B' }
  if (/culture|creative|intellectual|premium|luxury|high|art|museum/.test(v))
    return { bg: 'rgba(180,95,45,0.15)', color: '#B45F2D' }
  if (/social|night|underground|street|food|workshop|party|vibrant/.test(v))
    return { bg: 'rgba(91,138,154,0.15)', color: '#5B8A9A' }
  return { bg: 'rgba(255,255,255,0.06)', color: '#888' }
}

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCity, setFilterCity] = useState('All')
  const [filterPillar, setFilterPillar] = useState('All')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [venueExpanded, setVenueExpanded] = useState(new Set())
  const [filterGhost, setFilterGhost] = useState('all')
  const { showConfirm, ConfirmModal } = useConfirm()

  function loadEvents() {
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (filterCity !== 'All') params.set('city', filterCity)
    if (filterPillar !== 'All') params.set('pillar', filterPillar)
    if (filterGhost === 'ghost') params.set('ghost', 'true')
    else if (filterGhost === 'venue') params.set('ghost', 'false')

    adminFetch(`/api/events?${params}`)
      .then(data => {
        let filtered = data.events || []
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(e =>
            e.name?.toLowerCase().includes(q) ||
            e.city?.toLowerCase().includes(q)
          )
        }
        setEvents(filtered)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setSelectedIds(new Set())
      })
      .catch(err => console.error('[AdminEvents]', err.message))
  }

  useEffect(() => { loadEvents() }, [filterCity, filterPillar, filterGhost, search, page])

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) setPage(p)
  }

  function selectAll() {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(events.map(e => e._id)))
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    if (!await showConfirm(`Delete ${selectedIds.size} event(s)? This cannot be undone.`)) return
    for (const id of selectedIds) {
      await adminFetch(`/api/events/${id}`, { method: 'DELETE' }).catch(() => {})
    }
    setSelectedIds(new Set())
    loadEvents()
  }

  async function handleDelete(id) {
    if (!await showConfirm('Delete this event?')) return
    await adminFetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function handleEdit(event) {
    setEditingEvent(event)
    setShowEditor(true)
  }

  function handleCreate() {
    setEditingEvent(null)
    setShowEditor(true)
  }

  function handleEditorClose() {
    setShowEditor(false)
    setEditingEvent(null)
    loadEvents()
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatPrice(p) {
    if (!p || p === '—' || p === '') return null
    if (p.toLowerCase() === 'free' || p === '0' || p === '0.00') return 'Free'
    if (/^[\d,.]+$/.test(p)) return `₦${p}`
    return p
  }

  const hasPrice = events.some(e => e.price && e.price !== '—' && e.price !== '')

  function VibePill({ vibe }) {
    if (!vibe) return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
    const s = vibeStyle(vibe)
    return <span className="vibe-pill" style={{ background: s.bg, color: s.color }}>{vibe}</span>
  }

  function Pagination() {
    if (totalPages <= 1) return null
    const from = (page - 1) * PAGE_SIZE + 1
    const to = Math.min(page * PAGE_SIZE, total)
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
          <button className="pagination-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>‹</button>
          {start > 1 && <><button className="pagination-btn" onClick={() => goToPage(1)}>1</button><span className="pagination-ellipsis">…</span></>}
          {pages.map(p => <button key={p} className={`pagination-btn ${p === page ? 'pagination-active' : ''}`} onClick={() => goToPage(p)}>{p}</button>)}
          {end < totalPages && <><span className="pagination-ellipsis">…</span><button className="pagination-btn" onClick={() => goToPage(totalPages)}>{totalPages}</button></>}
          <button className="pagination-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>›</button>
        </div>
      </div>
    )
  }

  if (showEditor) {
    return <EventEditor event={editingEvent} onClose={handleEditorClose} />
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>+ Create Event</button>
        <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1) }}>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPillar} onChange={e => { setFilterPillar(e.target.value); setPage(1) }}>
          {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="filter-pills" style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'ghost', label: 'Pop-ups' },
            { key: 'venue', label: 'Venues' },
          ].map(opt => (
            <button
              key={opt.key}
              className={`admin-btn ${filterGhost === opt.key ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => { setFilterGhost(opt.key); setPage(1) }}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
        />
      </div>

      {events.length === 0 ? (
        <p className="admin-empty">No events found.</p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="admin-toolbar" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                {selectedIds.size} selected
              </span>
              <button className="admin-btn-sm admin-btn-delete" onClick={bulkDelete}>
                Delete Selected
              </button>
            </div>
          )}

          <Pagination />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={events.length > 0 && selectedIds.size === events.length}
                      onChange={selectAll}
                      style={{ accentColor: '#B45F2D' }}
                    />
                  </th>
                  <th style={{ width: 50 }}>Image</th>
                  <th>Name</th>
                  <th>Venue</th>
                  {hasPrice && <th>Price</th>}
                  <th>City</th>
                  <th>Date</th>
                  <th>Pillar</th>
                  <th>Vibe</th>
                  <th>Linked To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(event._id)}
                        onChange={() => toggleSelect(event._id)}
                        style={{ accentColor: '#B45F2D' }}
                      />
                    </td>
                    <td>
                      {event.imageUrl ? (
                        <a href={event.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={event.imageUrl} alt="" className="admin-thumb" />
                        </a>
                      ) : (
                        <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{event.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 12, cursor: event.venue ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={() => {
                        if (!event.venue) return
                        setVenueExpanded(prev => {
                          const next = new Set(prev)
                          next.has(event._id) ? next.delete(event._id) : next.add(event._id)
                          return next
                        })
                      }}
                      title={venueExpanded.has(event._id) ? '' : event.venue}
                    >
                      {venueExpanded.has(event._id) ? event.venue : (event.venue || '—')}
                    </td>
                    {hasPrice && <td style={{ fontSize: 12 }}>{formatPrice(event.price) || '—'}</td>}
                    <td>{event.city}</td>
                    <td>{formatDate(event.date)}</td>
                    <td><PillarBadge pillar={event.pillar} /></td>
                    <td><VibePill vibe={event.vibe} /></td>
                    <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      {event.linkedSpotId?.name || (event.isGhostLocation ? 'Pop-up' : '—')}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="admin-btn-sm admin-btn-edit" onClick={() => handleEdit(event)}>Edit</button>
                        <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDelete(event._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination />
        </>
      )}
      {ConfirmModal}
    </div>
  )
}

