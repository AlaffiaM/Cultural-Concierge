import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import { useConfirm } from './ConfirmModal'

const ALL_CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const CITIES_KEY = 'alaffia_active_cities'

const API_BASE = import.meta.env.VITE_API_URL || '(local proxy)'

function loadCities() {
  try {
    const saved = localStorage.getItem(CITIES_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return ALL_CITIES
}

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

export default function AdminSettings({ user }) {
  const [health, setHealth] = useState(null)
  const [team, setTeam] = useState([])
  const [activeCities, setActiveCities] = useState(loadCities)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState(null)
  const [confirmDanger, setConfirmDanger] = useState('')
  const { showAlert, ConfirmModal } = useConfirm()

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/health'),
      adminFetch('/api/admin/team'),
    ]).then(([h, t]) => {
      setHealth(h)
      setTeam(t)
    }).catch(err => console.error('[AdminSettings]', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(CITIES_KEY, JSON.stringify(activeCities))
  }, [activeCities])

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

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-grid">
          {[1, 2].map(i => (
            <div key={i} className="admin-stat-card" style={{ padding: '28px 20px' }}>
              <div className="skeleton skeleton-md" style={{ width: '60%', marginBottom: 8 }} />
              <div className="skeleton skeleton-sm" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
        <div className="settings-section">
          <div className="skeleton skeleton-md" style={{ width: '30%', marginBottom: 12 }} />
          <div className="health-card">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-sm" style={{ width: '80%', margin: '8px 0' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      {/* ── Account ── */}
      <div className="settings-group-header">Account</div>

      <div className="settings-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon white">👤</div>
            <div>
              <div className="admin-stat-number" style={{ fontSize: 18 }}>{user?.fullName || 'Admin'}</div>
              <div className="admin-stat-label">{user?.primaryEmailAddress?.emailAddress || 'Unknown'}</div>
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon sage">🔑</div>
            <div>
              <div className="admin-stat-number" style={{ fontSize: 18 }}>Admin</div>
              <div className="admin-stat-label">Full access to all content</div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="team-list">
          {team.map((member, i) => (
            <div key={i} className="team-row">
              <div className="team-avatar">{member.email[0].toUpperCase()}</div>
              <div className="team-info">
                <span className="team-email">{member.email}</span>
                <span className="team-role">{member.role}</span>
              </div>
              <span className="team-badge">{member.added}</span>
            </div>
          ))}
        </div>
        <button className="admin-btn admin-btn-secondary" style={{ marginTop: 10 }} disabled>
          Invite Admin
        </button>
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--admin-text-muted)' }}>
          Invite via <code style={{ color: 'var(--admin-copper)', background: 'rgba(180,95,45,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ADMIN_EMAILS</code> environment variable
        </span>
      </div>

      {/* ── System ── */}
      <div className="settings-group-header">System</div>

      <div className="settings-section">
        <div className="settings-grid">
          <div className="health-card">
            <h4 className="admin-section-title" style={{ marginBottom: 8 }}>Server Health</h4>
            <div className="health-card-row">
              <span className="health-label">Database</span>
              <span className={`health-value health-dot ${health?.database === 'connected' ? 'connected' : health?.database === 'connecting' ? 'warn' : 'bad'}`}>
                {health?.database === 'connected' ? '● Connected' : health?.database === 'connecting' ? '● Connecting' : '○ Disconnected'}
              </span>
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
              <span className="health-label">Server Uptime</span>
              <span className="health-value">{health ? formatUptime(health.uptime) : '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Auth</span>
              <span className={`health-value health-dot ${health?.authConfigured ? 'connected' : 'bad'}`}>
                {health?.authConfigured ? '● Configured' : '○ Not configured'}
              </span>
            </div>
            <div className="health-card-row">
              <span className="health-label">API Endpoint</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{API_BASE}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Node Version</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{health?.nodeVersion || '—'}</span>
            </div>
          </div>
          <div className="health-card">
            <h4 className="admin-section-title" style={{ marginBottom: 8 }}>Content Stats</h4>
            <div className="health-card-row">
              <span className="health-label">Total Events</span>
              <span className="health-value">{health?.eventCount ?? '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Venues</span>
              <span className="health-value">{health?.venueCount ?? '—'}</span>
            </div>
          </div>
        </div>
        <p className="settings-note" style={{ marginTop: 8 }}>
          Environment variables are configured on the server. API keys are never exposed in the UI.
        </p>
      </div>

      {/* ── Content ── */}
      <div className="settings-group-header">Content</div>

      <div className="settings-section">
        <h3 className="admin-section-title">Active Cities</h3>
        <p className="settings-note">Toggle which cities are shown in the app. Saved locally.</p>
        <div className="city-toggles">
          {ALL_CITIES.map(city => (
            <label key={city} className="city-toggle">
              <input
                type="checkbox"
                checked={activeCities.includes(city)}
                onChange={() => toggleCity(city)}
              />
              <span className="city-toggle-label">{city}</span>
            </label>
          ))}
        </div>
      </div>



      {/* ── Danger Zone ── */}
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

      {ConfirmModal}
    </div>
  )
}
