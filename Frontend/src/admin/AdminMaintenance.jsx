import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import { getClerkToken } from '../lib/clerk'
import { API_BASE } from '../lib/api'

const EXPORTS = [
  { label: 'Events', endpoint: '/api/admin/export/events', filename: 'events-export.csv' },
  { label: 'Venues', endpoint: '/api/admin/export/venues', filename: 'venues-export.csv' },
  { label: 'Subscribers', endpoint: '/api/admin/subscribers/export', filename: 'subscribers.csv' },
]

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminMaintenance({ exportOnly }) {
  const [confirmDanger, setConfirmDanger] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState(null)
  const [exporting, setExporting] = useState('')
  const [deduping, setDeduping] = useState(false)
  const [dedupResult, setDedupResult] = useState(null)
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)

  useEffect(() => {
    if (exportOnly) return
    adminFetch('/api/system/health')
      .then(setHealth)
      .catch(err => console.error('[AdminMaintenance] Health:', err.message))
      .finally(() => setHealthLoading(false))
  }, [exportOnly])

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

  async function handleDedup() {
    setDeduping(true)
    setDedupResult(null)
    try {
      const res = await adminFetch('/api/events/deduplicate', { method: 'POST' })
      setDedupResult(res)
    } catch (err) {
      setDedupResult({ error: err.message })
    } finally {
      setDeduping(false)
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

  if (exportOnly) {
    return (
      <div className="settings-page">
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

  return (
    <div className="settings-page">
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

      <div className="settings-group-header">Cleanup</div>

      <div className="settings-section">
        <div className="danger-info" style={{ marginBottom: 12 }}>
          <strong>Remove duplicate events</strong>
          <p>Scans the database for events with the same name, city, and date, and removes the duplicates.</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={handleDedup} disabled={deduping}>
          {deduping ? 'Scanning...' : 'Remove Duplicates'}
        </button>
        {dedupResult && !dedupResult.error && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--admin-text)' }}>
            {dedupResult.duplicatesRemoved > 0
              ? `✓ Removed ${dedupResult.duplicatesRemoved} duplicate event(s) from ${dedupResult.duplicatesFound} group(s)`
              : '✓ No duplicates found'}
          </div>
        )}
        {dedupResult?.error && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#dc3232' }}>✗ {dedupResult.error}</div>
        )}
      </div>

      <div className="settings-group-header">System Health</div>

      <div className="settings-section">
        {healthLoading ? (
          <p className="admin-empty">Loading system health...</p>
        ) : (
          <div className="health-card">
            <div className="health-card-row">
              <span className="health-label">Database</span>
              <span className={`health-value health-dot ${health?.database === 'connected' ? 'connected' : health?.database === 'connecting' ? 'warn' : 'bad'}`}>
                {health?.database === 'connected' ? '● Connected' : health?.database === 'connecting' ? '● Connecting' : '○ Disconnected'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Server Uptime</span>
              <span className="health-value">{health ? formatUptime(health.uptime) : '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Last Scraper Run</span>
              <span className="health-value">{formatDate(health?.lastScraperRun)}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Gemini API</span>
              <span className={`health-value health-dot ${health?.geminiKeyConfigured ? 'connected' : 'bad'}`}>
                {health?.geminiKeyConfigured ? '● Configured' : '○ Not configured'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Auth</span>
              <span className={`health-value health-dot ${health?.authConfigured ? 'connected' : 'bad'}`}>
                {health?.authConfigured ? '● Configured' : '○ Not configured'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Node Version</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{health?.nodeVersion || '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Events</span>
              <span className="health-value">{health?.eventCount ?? '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Venues</span>
              <span className="health-value">{health?.venueCount ?? '—'}</span>
            </div>
          </div>
        )}
        <p className="settings-note" style={{ marginTop: 8 }}>
          Environment variables are configured on the server. API keys are never exposed in the UI.
        </p>
      </div>
    </div>
  )
}
