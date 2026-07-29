import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import { getClerkToken } from '../clerk'

const ALL_CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const CITIES_KEY = 'alaffia_active_cities'
const VIBES_KEY = 'alaffia_vibe_tags'

const PRESET_VIBES = [
  '#SocialCreative', '#QuietIntellectual', '#ActiveWellness', '#HighCulture',
  '#PremiumLuxury', '#NatureEscape', '#WellnessRetreat', '#Nightlife',
  '#Underground', '#StreetCulture', '#Foodie', '#Workshop', '#HiddenGem',
]

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

function loadVibes() {
  try {
    const saved = localStorage.getItem(VIBES_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return null
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
  const [vibeTags, setVibeTags] = useState([])
  const [newVibe, setNewVibe] = useState('')
  const [activeCities, setActiveCities] = useState(loadCities)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState(null)
  const [confirmDanger, setConfirmDanger] = useState('')

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/health'),
      adminFetch('/api/admin/team'),
      adminFetch('/api/admin/vibe-tags'),
    ]).then(([h, t, v]) => {
      setHealth(h)
      setTeam(t)
      const localVibes = loadVibes()
      setVibeTags(localVibes || v)
    }).catch(err => console.error('[AdminSettings]', err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(CITIES_KEY, JSON.stringify(activeCities))
  }, [activeCities])

  useEffect(() => {
    localStorage.setItem(VIBES_KEY, JSON.stringify(vibeTags))
  }, [vibeTags])

  function toggleCity(city) {
    setActiveCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function addVibeTag() {
    const tag = newVibe.trim()
    if (!tag || vibeTags.includes(tag)) return
    setVibeTags(prev => [...prev, tag].sort())
    setNewVibe('')
  }

  function removeVibeTag(tag) {
    setVibeTags(prev => prev.filter(t => t !== tag))
  }

  async function handleExport(type) {
    try {
      const token = await getClerkToken()
      const res = await fetch(`${API_BASE}/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-export.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    }
  }

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
      {/* Admin Profile */}
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

      {/* System Health */}
      <div className="settings-section">
        <h3 className="admin-section-title">System Health</h3>
        <div className="settings-grid">
          <div className="health-card">
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
              <span className="health-label">Total Events</span>
              <span className="health-value">{health?.eventCount ?? '—'}</span>
            </div>
            <div className="health-card-row">
              <span className="health-label">Total Spots</span>
              <span className="health-value">{health?.spotCount ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="settings-section">
        <h3 className="admin-section-title">API Configuration</h3>
        <div className="settings-grid">
          <div className="health-card">
            <div className="health-card-row">
              <span className="health-label">API Endpoint</span>
              <span className="health-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{API_BASE}</span>
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
          </div>
        </div>
        <p className="settings-note">
          Environment variables are configured on the server. API keys are never exposed in the UI.
        </p>
      </div>

      {/* Cities */}
      <div className="settings-section">
        <h3 className="admin-section-title">Active Cities</h3>
        <p className="settings-note">Toggle which cities are shown. This setting is saved locally.</p>
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

      {/* Categories & Vibe Tags */}
      <div className="settings-section">
        <h3 className="admin-section-title">Categories &amp; Vibe Tags</h3>
        <p className="settings-note">Manage vibe tags used across events and spots. Changes are saved locally.</p>
        <div className="vibe-tags-area">
          {vibeTags.map(tag => (
            <span key={tag} className="vibe-tag">
              {tag}
              <button className="vibe-tag-remove" onClick={() => removeVibeTag(tag)}>✕</button>
            </span>
          ))}
        </div>
        <div className="vibe-tag-add-row">
          <input
            type="text"
            placeholder="Add new vibe tag (e.g. #HiddenGem)"
            value={newVibe}
            onChange={e => setNewVibe(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addVibeTag() }}
          />
          <button className="admin-btn admin-btn-secondary" onClick={addVibeTag} disabled={!newVibe.trim()}>Add</button>
        </div>
        <details className="settings-details">
          <summary>Show preset suggestions</summary>
          <div className="vibe-presets">
            {PRESET_VIBES.filter(t => !vibeTags.includes(t)).map(tag => (
              <button key={tag} className="vibe-preset-btn" onClick={() => { setNewVibe(tag) }}>
                {tag}
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Export Data */}
      <div className="settings-section">
        <h3 className="admin-section-title">Export Data</h3>
        <p className="settings-note">Download your data as CSV files for reporting or migration.</p>
        <div className="export-actions">
          <button className="admin-quick-action" onClick={() => handleExport('events')} style={{ flex: 1 }}>
            <div className="admin-quick-action-icon copper">📅</div>
            <div className="admin-quick-action-body">
              <h4>Export Events to CSV</h4>
              <p>Download all events with city, date, pillar, and source</p>
            </div>
          </button>
          <button className="admin-quick-action" onClick={() => handleExport('spots')} style={{ flex: 1 }}>
            <div className="admin-quick-action-icon sage">📍</div>
            <div className="admin-quick-action-body">
              <h4>Export Spots to CSV</h4>
              <p>Download all spots with type, pillar, and status</p>
            </div>
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="settings-section">
        <h3 className="admin-section-title">Team Members</h3>
        <p className="settings-note">Admins have full access to all content and settings.</p>
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

      {/* Danger Zone */}
      <div className="settings-section danger-zone">
        <h3 className="admin-section-title" style={{ color: '#dc3232' }}>Danger Zone</h3>
        <p className="settings-note" style={{ color: '#e55555' }}>
          These actions are irreversible. Proceed with caution.
        </p>
        <div className="danger-card">
          <div className="danger-info">
            <strong>Clear all scraped events</strong>
            <p>This permanently deletes all events imported from external scrapers (Ticketsasa, KenyaBuzz, Mookh, Eventbrite). Manually created events will not be affected.</p>
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
      </div>
    </div>
  )
}
