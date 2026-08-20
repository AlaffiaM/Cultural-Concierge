import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import VenueEditor from './VenueEditor'
import { useConfirm } from './ConfirmModal'
import { useToast } from './Toast'
import SelectAllCheckbox from './components/SelectAllCheckbox'

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['All', 'CULTURE', 'WELLNESS', 'SOCIAL']
const PAGE_SIZE = 20

const SCRAPER_SOURCES = ['gemini', 'ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite', 'tixafrica']

function sourceStyle(source) {
  if (!source) return { bg: 'rgba(255,255,255,0.06)', color: '#666', label: '—' }
  const s = source.toLowerCase()
  if (s === 'manual' || s === 'curated') {
    return { bg: 'rgba(91,107,138,0.15)', color: '#6B7F9E', label: source.toUpperCase() }
  }
  if (SCRAPER_SOURCES.includes(s)) {
    return { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B', label: source.toUpperCase() }
  }
  return { bg: 'rgba(255,255,255,0.06)', color: '#888', label: source.toUpperCase() }
}

function timeAgo(date) {
  if (!date) return '—'
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminVenues() {
  const [venues, setVenues] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCity, setFilterCity] = useState('All')
  const [filterPillar, setFilterPillar] = useState('All')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingVenue, setEditingVenue] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [enriching, setEnriching] = useState(false)
  const { showConfirm, ConfirmModal } = useConfirm()
  const { addToast } = useToast()

  function loadVenues() {
    const params = new URLSearchParams({ all: 'true', page, limit: PAGE_SIZE })
    if (filterCity !== 'All') params.set('city', filterCity)

    adminFetch(`/api/venues?${params}`)
      .then(data => {
        let filtered = data.venues || []
        if (filterPillar !== 'All') {
          filtered = filtered.filter(s => s.pillar === filterPillar)
        }
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q) ||
            (s.tags || []).some(t => t.toLowerCase().includes(q))
          )
        }
        setVenues(filtered)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setSelectedIds(new Set())
      })
      .catch(err => console.error('[AdminVenues]', err.message))
  }

  useEffect(() => { setPage(1) }, [filterCity, filterPillar, search])
  useEffect(() => { loadVenues() }, [filterCity, filterPillar, page, search])

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) setPage(p)
  }

  function selectAll() {
    if (selectedIds.size === venues.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(venues.map(s => s._id)))
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkToggleStatus(setActive) {
    if (!await showConfirm(`${setActive ? 'Activate' : 'Deactivate'} ${selectedIds.size} venue(s)?`)) return
    for (const id of selectedIds) {
      await adminFetch(`/api/venues/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: setActive ? 'active' : 'inactive' }),
      }).catch(() => {})
    }
    setSelectedIds(new Set())
    loadVenues()
  }

  async function handleToggleStatus(venue) {
    const newStatus = venue.status === 'scraped' ? 'active' : venue.status === 'active' ? 'inactive' : 'active'
    await adminFetch(`/api/venues/${venue._id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    })
    loadVenues()
  }

  async function handleApproveVenue(id) {
    await adminFetch(`/api/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active' }),
    })
    loadVenues()
  }

  async function handleDelete(id) {
    if (!await showConfirm('Delete this venue?')) return
    await adminFetch(`/api/venues/${id}`, { method: 'DELETE' })
    loadVenues()
  }

  function handleEdit(venue) {
    setEditingVenue(venue)
    setShowEditor(true)
  }

  function handleCreate() {
    setEditingVenue(null)
    setShowEditor(true)
  }

  async function handleEnrichImages() {
    if (!await showConfirm('Look up Wikipedia for all venues missing images? This may take a while.')) return
    setEnriching(true)
    try {
      const data = await adminFetch('/api/venues/batch-enrich', { method: 'POST', body: '{}' })
      addToast(`${data.enriched} enriched, ${data.skipped} skipped (${data.total} total without images)`, data.enriched > 0 ? 'success' : 'info')
      loadVenues()
    } catch (err) {
      addToast(err.message || 'Enrich failed', 'error')
    } finally {
      setEnriching(false)
    }
  }

  function handleEditorClose() {
    setShowEditor(false)
    setEditingVenue(null)
    loadVenues()
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
    return <VenueEditor venue={editingVenue} onClose={handleEditorClose} />
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>+ Create Venue</button>
        <button className="admin-btn admin-btn-secondary" onClick={handleEnrichImages} disabled={enriching} style={{ fontSize: 11, padding: '4px 10px' }}>
          {enriching ? 'Enriching...' : 'Enrich Images'}
        </button>
        <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1) }}>
          <option value="All">All Cities</option>
          {CITIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPillar} onChange={e => { setFilterPillar(e.target.value); setPage(1) }}>
          {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          className="search-input"
          type="text"
          placeholder="Search venues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0, flex: 1, minWidth: 160 }}
        />
      </div>

      {venues.length === 0 ? (
        <p className="admin-empty">No venues found.</p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="admin-toolbar" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                {selectedIds.size} selected
              </span>
              <button className="admin-btn-sm admin-btn-approve" onClick={() => bulkToggleStatus(true)}>
                Activate All
              </button>
              <button className="admin-btn-sm admin-btn-archive" onClick={() => bulkToggleStatus(false)}>
                Deactivate All
              </button>
            </div>
          )}

          <Pagination />

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <SelectAllCheckbox
                      checked={venues.length > 0 && selectedIds.size === venues.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < venues.length}
                      onChange={selectAll}
                    />
                  </th>
                  <th style={{ width: 50 }}>Image</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Pillar</th>
                  <th>Type</th>
                  <th>Tags</th>
                  <th>Source</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.map(venue => {
                  const src = sourceStyle(venue.source)
                  return (
                    <tr key={venue._id} className="venues-hover-row">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(venue._id)}
                          onChange={() => toggleSelect(venue._id)}
                          style={{ accentColor: 'var(--admin-copper)' }}
                        />
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {venue.images && venue.images.length > 0 ? (
                              <a href={venue.images[0]} target="_blank" rel="noopener noreferrer">
                                <img src={venue.images[0]} alt="" className="admin-thumb" />
                              </a>
                            ) : (
                              <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                            )}
                            <span
                              style={{
                                position: 'absolute', top: -2, right: -2, width: 10, height: 10,
                                borderRadius: '50%',
                                background: venue.images?.length > 0 ? '#4CAF50' : '#555',
                                border: '2px solid var(--admin-card)',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', lineHeight: 1.3 }}>
                            {venue.images?.length > 0
                              ? `${venue.images.length} image${venue.images.length > 1 ? 's' : ''}`
                              : 'No image'}
  
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{venue.name}</td>
                      <td>{venue.city}</td>
                      <td>{venue.pillar}</td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>{venue.type || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {(venue.vibeTags || []).slice(0, 4).map(tag => (
                            <span key={tag} className="vibe-pill">{tag}</span>
                          ))}
                          {(venue.vibeTags || []).length > 4 && (
                            <span className="vibe-pill-more">+{venue.vibeTags.length - 4}</span>
                          )}
                          {(venue.tags || []).length > 0 && (venue.vibeTags || []).length === 0 && (
                            <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>
                              {(venue.tags || []).slice(0, 3).join(', ')}{venue.tags?.length > 3 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="source-pill" style={{ background: src.bg, color: src.color }}>
                          {src.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(venue.updatedAt)}
                      </td>
                      <td>
                        <button
                          className={`admin-status-badge ${venue.status === 'active' ? 'admin-status-active' : venue.status === 'scraped' ? 'admin-status-scraped' : 'admin-status-inactive'}`}
                          onClick={() => handleToggleStatus(venue)}
                          title="Click to toggle status"
                        >
                          {venue.status}
                        </button>
                      </td>
                      <td>
                        <div className="actions">
                          {venue.status === 'scraped' && (
                            <button className="admin-btn-sm admin-btn-approve" onClick={() => handleApproveVenue(venue._id)}>Approve</button>
                          )}
                          <button className="admin-btn-sm admin-btn-edit" onClick={() => handleEdit(venue)}>Edit</button>
                          <button className="admin-btn-sm admin-btn-delete" onClick={() => handleDelete(venue._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
