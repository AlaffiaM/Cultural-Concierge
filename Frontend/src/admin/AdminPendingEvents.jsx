import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const PILLAR_STYLE = {
  CULTURE: { bg: 'rgba(180,95,45,0.15)', color: '#B45F2D' },
  WELLNESS: { bg: 'rgba(138,154,91,0.15)', color: '#8A9A5B' },
  SOCIAL: { bg: 'rgba(91,138,154,0.15)', color: '#5B8A9A' },
}

const CITIES = ['All', 'Lagos', 'Abuja', 'Kigali', 'Nairobi']

function PillarBadge({ pillar }) {
  if (!pillar) return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>
  const s = PILLAR_STYLE[pillar] || { bg: 'rgba(255,255,255,0.06)', color: '#888' }
  return <span className="pillar-badge" style={{ background: s.bg, color: s.color }}>{pillar}</span>
}

export default function AdminPendingEvents() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [approving, setApproving] = useState(false)
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
    } catch (err) {
      console.error('[AdminPendingEvents] Approve failed:', err.message)
    } finally {
      setApproving(false)
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
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(220,50,50,0.06)', border: '1px solid rgba(220,50,50,0.2)', borderRadius: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#dc3232' }}>
          &#x1F4E5; {pending.length} event{pending.length > 1 ? 's' : ''} from scraper{pending.length > 1 ? 's' : ''} — not yet approved
        </span>
        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginLeft: 8 }}>
          hidden from the app until approved
        </span>
      </div>

      <div className="admin-toolbar" style={{ marginBottom: 12 }}>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="filter-pills" style={{ display: 'flex', gap: 4, marginRight: 12 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'ghost', label: 'Pop-ups' },
            { key: 'venue', label: 'Venues' },
          ].map(opt => (
            <button
              key={opt.key}
              className={`admin-btn ${filterGhost === opt.key ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setFilterGhost(opt.key)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button className="admin-btn-sm admin-btn-edit" onClick={selectAll}>
          {selected.size === pending.length ? 'Deselect All' : 'Select All'}
        </button>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleApprove}
          disabled={selected.size === 0 || approving}
          style={{ padding: '4px 14px', fontSize: 12, marginLeft: 'auto' }}
        >
          {approving ? 'Approving...' : `Approve (${selected.size})`}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th style={{ width: 50 }}>Image</th>
              <th>Name</th>
              <th>Venue</th>
              <th>Source</th>
              <th>City</th>
              <th>Date</th>
              <th>Pillar</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(ev => (
              <tr key={ev._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(ev._id)}
                    onChange={() => toggleSelect(ev._id)}
                    style={{ accentColor: 'var(--admin-copper)' }}
                  />
                </td>
                <td>
                  {ev.imageUrl ? (
                    <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={ev.imageUrl} alt="" className="admin-thumb" />
                    </a>
                  ) : (
                    <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  )}
                </td>
                <td style={{ fontWeight: 600 }}>{ev.name}</td>
                <td style={{ color: 'var(--admin-text-muted)', fontSize: 12, maxWidth: 160 }}>{ev.venue || '—'}</td>
                <td>
                  <span className="admin-status-badge" style={{ background: 'rgba(180,95,45,0.15)', color: '#B45F2D' }}>
                    {ev.source}
                  </span>
                </td>
                <td>{ev.city}</td>
                <td>{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>
                  <PillarBadge pillar={ev.pillar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
