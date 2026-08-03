import { useState } from 'react'
import { adminFetch } from './adminApi'
import { getClerkToken } from '../lib/clerk'
import { API_BASE } from '../lib/api'

const EXPORTS = [
  { label: 'Events', endpoint: '/api/admin/export/events', filename: 'events-export.csv' },
  { label: 'Venues', endpoint: '/api/admin/export/venues', filename: 'venues-export.csv' },
  { label: 'Subscribers', endpoint: '/api/admin/subscribers/export', filename: 'subscribers.csv' },
]

export default function AdminMaintenance({ exportOnly, onNavigate }) {
  const [confirmDanger, setConfirmDanger] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState(null)
  const [exporting, setExporting] = useState('')

  async function handleClearScraped() {
    if (confirmDanger !== 'CLEAR') return
    setClearing(true)
    setClearResult(null)
    try {
      const res = await adminFetch('/api/admin/scraped-events', { method: 'DELETE' })
      setClearResult({ ok: true, deleted: res.deleted })
      setConfirmDanger('')
    } catch (err) {
      setClearResult({ ok: false, message: err.message })
    } finally {
      setClearing(false)
    }
  }

  async function handleExport(endpoint, filename) {
    setExporting(endpoint)
    try {
      const token = await getClerkToken()
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[AdminMaintenance] Export failed:', err.message)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="settings-page">
      {!exportOnly && (
        <>
          <div className="settings-group-header" style={{ color: '#dc3232' }}>Danger Zone</div>

          <div className="danger-card settings-section">
            <div className="danger-info">
              <strong>Clear all scraped events</strong>
              <p>Permanently deletes all events imported from external scrapers (Ticketsasa, KenyaBuzz, Mookh, Eventbrite). Manual events are not affected.</p>
            </div>
            <div className="danger-action">
              <input
                type="text"
                placeholder='Type "CLEAR" to confirm'
                value={confirmDanger}
                onChange={e => setConfirmDanger(e.target.value)}
                className="danger-input"
              />
              <button
                className="admin-btn danger-btn"
                disabled={confirmDanger !== 'CLEAR' || clearing}
                onClick={handleClearScraped}
              >
                {clearing ? 'Clearing...' : 'Clear Scraped Events'}
              </button>
            </div>
            {clearResult && (
              <div style={{ marginTop: 10, fontSize: 13, color: clearResult.ok ? '#8A9A5B' : '#dc3232' }}>
                {clearResult.ok
                  ? `✓ Deleted ${clearResult.deleted} scraped event(s)`
                  : `✗ ${clearResult.message}`}
              </div>
            )}
          </div>
        </>
      )}

      <div className="settings-group-header">Export Data</div>

      <div className="settings-section">
        <p className="settings-note">Download CSV backups of your content. Files are generated from the live database.</p>
        <div className="admin-quick-actions" style={{ marginBottom: 0 }}>
          {EXPORTS.map(({ label, endpoint, filename }) => (
            <button
              key={endpoint}
              className="admin-quick-action"
              onClick={() => handleExport(endpoint, filename)}
              disabled={!!exporting}
            >
              <div className="admin-quick-action-icon white">⬇️</div>
              <div className="admin-quick-action-body">
                <h4>{exporting === endpoint ? 'Downloading...' : `Export ${label}`}</h4>
                <p>Download {label.toLowerCase()} as CSV</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
