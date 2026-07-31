import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import { getClerkToken } from '../lib/clerk'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/subscribers')
      .then(setSubscribers)
      .catch(err => console.error('[AdminSubscribers]', err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = subscribers.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.email.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q)
  })

  async function handleExport() {
    try {
      const token = await getClerkToken()
      const res = await fetch(`${API_BASE}/api/admin/subscribers/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'subscribers.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[AdminSubscribers] Export failed:', err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-section">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Name</th><th>Source</th><th>Subscribed</th></tr></thead>
            <tbody>
              {[1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4].map(j => (
                    <td key={j}><div className="skeleton skeleton-sm" style={{ width: j === 1 ? '70%' : '40%' }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search subscribers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
        />
        <span style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
          {subscribers.length} total
        </span>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}>
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">
          {search ? 'No subscribers match your search.' : 'No subscribers yet.'}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Source</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.email}</td>
                  <td style={{ color: 'var(--admin-text-muted)' }}>{s.name || '—'}</td>
                  <td>
                    <span className="admin-status-badge" style={{ background: s.source === 'signin' ? 'rgba(138,154,91,0.15)' : 'rgba(91,107,138,0.15)', color: s.source === 'signin' ? '#8A9A5B' : '#6B7F9E' }}>
                      {s.source === 'signin' ? 'Sign-in' : 'Form'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>
                    {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
