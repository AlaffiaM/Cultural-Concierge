import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import SelectAllCheckbox from './components/SelectAllCheckbox'
import { PILLAR_STYLE, SOURCE_STYLE } from './components/adminStyles'

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']

function PillarBadge({ pillar }) {
  if (!pillar) return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
  const s = PILLAR_STYLE[pillar] || { bg: 'rgba(255,255,255,0.06)', color: '#888', border: '#888' }
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em',
      background: s.bg, color: s.color, borderLeft: `2px solid ${s.border}`,
    }}>{pillar}</span>
  )
}

function SourceBadge({ source }) {
  const s = SOURCE_STYLE[source] || { bg: 'rgba(255,255,255,0.06)', color: '#888' }
  return (
    <span className="admin-status-badge" style={{ background: s.bg, color: s.color }}>
      {source}
    </span>
  )
}

export default function AdminPendingEvents() {
  const { addToast } = useToast()
  const { showConfirm, ConfirmModal } = useConfirm()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [approving, setApproving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filterGhost, setFilterGhost] = useState('all')
  const [filterCity, setFilterCity] = useState('All')

  async function loadPending() {
    setLoading(true)
    try {
      let url = '/api/events/pending'
      const params = new URLSearchParams()
      if (filterCity !== 'All') params.set('city', filterCity)
      if (filterGhost === 'ghost') params.set('ghost', 'true')
      else if (filterGhost === 'venue') params.set('ghost', 'false')
      const qs = params.toString()
      if (qs) url += `?${qs}`
      const data = await adminFetch(url)
      setPending(data)
    } catch (err) {
      console.error('[AdminPendingEvents] Load failed:', err.message)
      addToast('Failed to load pending events', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPending() }, [filterGhost, filterCity])

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === pending.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pending.map(e => e._id)))
    }
  }

  async function handleApprove() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setApproving(true)
    try {
      await adminFetch('/api/scraper/approve', {
        method: 'POST',
        body: JSON.stringify({ eventIds: ids }),
      })
      setPending(prev => prev.filter(e => !ids.includes(e._id)))
      setSelected(new Set())
      addToast(`${ids.length} event${ids.length > 1 ? 's' : ''} approved`, 'success')
    } catch (err) {
      console.error('[AdminPendingEvents] Approve failed:', err.message)
      addToast('Failed to approve events', 'error')
    } finally {
      setApproving(false)
    }
  }

  async function handleDelete() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!await showConfirm(`Permanently delete ${ids.length} event${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await adminFetch('/api/scraper/reject', {
        method: 'POST',
        body: JSON.stringify({ eventIds: ids }),
      })
      setPending(prev => prev.filter(e => !ids.includes(e._id)))
      setSelected(new Set())
      addToast(`${ids.length} event${ids.length > 1 ? 's' : ''} deleted`, 'success')
    } catch (err) {
      console.error('[AdminPendingEvents] Delete failed:', err.message)
      addToast('Failed to delete events', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteSingle(id) {
    if (!await showConfirm('Permanently delete this event? This cannot be undone.')) return
    setDeleting(true)
    try {
      await adminFetch('/api/scraper/reject', {
        method: 'POST',
        body: JSON.stringify({ eventIds: [id] }),
      })
      setPending(prev => prev.filter(e => e._id !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
      addToast('Event deleted', 'success')
    } catch (err) {
      console.error('[AdminPendingEvents] Delete failed:', err.message)
      addToast('Failed to delete event', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="admin-empty">Loading pending events...</p>
  }

  if (pending.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p className="admin-empty">No pending events — all draft events have been reviewed.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        marginBottom: 16, padding: '10px 16px',
        background: 'rgba(180,95,45,0.08)', border: '1px solid rgba(180,95,45,0.2)',
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 6, background: 'rgba(180,95,45,0.2)',
          fontSize: 12, flexShrink: 0,
        }}>&#x1F4E5;</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
          {pending.length} pending event{pending.length > 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
          — hidden from the app until approved
        </span>
      </div>

      <div className="admin-toolbar" style={{ marginBottom: 12, gap: 6 }}>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 3 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'ghost', label: 'Pop-ups' },
            { key: 'venue', label: 'Venues' },
          ].map(opt => (
            <button
              key={opt.key}
              className={`admin-btn ${filterGhost === opt.key ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setFilterGhost(opt.key)}
              style={{ fontSize: 11, padding: '5px 10px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleApprove}
            disabled={selected.size === 0 || approving}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            {approving ? 'Approving...' : `Approve (${selected.size})`}
          </button>
          <button
            className="admin-btn admin-btn-delete"
            onClick={handleDelete}
            disabled={selected.size === 0 || deleting}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            {deleting ? 'Deleting...' : `Delete (${selected.size})`}
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 32, textAlign: 'center' }}>
                <SelectAllCheckbox
                  checked={pending.length > 0 && selected.size === pending.length}
                  indeterminate={selected.size > 0 && selected.size < pending.length}
                  onChange={selectAll}
                />
              </th>
              <th style={{ width: 48 }}></th>
              <th>Name</th>
              <th>Venue</th>
              <th>Source</th>
              <th>City</th>
              <th>Date</th>
              <th>Pillar</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {pending.map(ev => (
              <tr key={ev._id} style={{ transition: 'background 0.1s' }}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(ev._id)}
                    onChange={() => toggleSelect(ev._id)}
                    style={{ accentColor: 'var(--admin-copper)', width: 14, height: 14, cursor: 'pointer' }}
                  />
                </td>
                <td>
                  {ev.imageUrl ? (
                    <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={ev.imageUrl} alt="" className="admin-thumb" style={{ width: 36, height: 36 }} />
                    </a>
                  ) : (
                    <div className="admin-thumb" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.04)' }} />
                  )}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--admin-text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.name}
                </td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.venue || '—'}
                </td>
                <td>
                  <SourceBadge source={ev.source} />
                </td>
                <td style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{ev.city}</td>
                <td style={{ fontSize: 11, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <PillarBadge pillar={ev.pillar} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => handleDeleteSingle(ev._id)}
                    disabled={deleting}
                    title="Delete event"
                    style={{
                      background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer',
                      color: 'var(--admin-text-muted)', opacity: deleting ? 0.3 : 0.5,
                      padding: 4, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!deleting) { e.currentTarget.style.color = '#dc3232'; e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(220,50,50,0.1)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--admin-text-muted)'; e.currentTarget.style.opacity = deleting ? '0.3' : '0.5'; e.currentTarget.style.background = 'none'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M6 5.5v3.5M8 5.5v3.5M4 3.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ConfirmModal}
    </div>
  )
}
