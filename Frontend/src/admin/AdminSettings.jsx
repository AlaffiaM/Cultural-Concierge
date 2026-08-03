import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'
import AdminTags from './AdminTags'

const ALL_CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const CITIES_KEY = 'alaffia_active_cities'

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

function GeneralSection() {
  const [activeCities, setActiveCities] = useState(loadCities)

  useEffect(() => {
    localStorage.setItem(CITIES_KEY, JSON.stringify(activeCities))
  }, [activeCities])

  function toggleCity(city) {
    setActiveCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  return (
    <>
      <div className="settings-group-header">General</div>
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
    </>
  )
}

function AccountsSection() {
  const [admins, setAdmins] = useState(null)

  useEffect(() => {
    adminFetch('/api/system/admin-emails')
      .then(data => setAdmins(Array.isArray(data) ? data : []))
      .catch(err => console.error('[AdminSettings] Accounts:', err.message))
  }, [])

  return (
    <>
      <div className="settings-group-header">Admin Accounts</div>
      <div className="settings-section">
        <p className="settings-note">
          Admins are granted access via the <code style={{ color: 'var(--admin-copper)', background: 'rgba(180,95,45,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ADMIN_EMAILS</code> environment variable on the server.
        </p>
        {admins === null ? (
          <p className="admin-empty">Loading accounts...</p>
        ) : admins.length === 0 ? (
          <p className="admin-empty">No admin accounts configured. Set ADMIN_EMAILS on the server.</p>
        ) : (
          <div className="team-list">
            {admins.map((member, i) => (
              <div key={i} className="team-row">
                <div className="team-avatar">{member.email[0].toUpperCase()}</div>
                <div className="team-info">
                  <span className="team-email">{member.email}</span>
                  <span className="team-role">{member.role}</span>
                </div>
                <span className="team-badge">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function KeysSection() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    adminFetch('/api/system/health')
      .then(setHealth)
      .catch(err => console.error('[AdminSettings] Keys:', err.message))
  }, [])

  const rows = [
    { label: 'Gemini AI', configured: health?.geminiKeyConfigured, hint: 'GEMINI_API_KEY' },
    { label: 'Authentication', configured: health?.authConfigured, hint: 'CLERK_SECRET_KEY' },
  ]

  return (
    <>
      <div className="settings-group-header">API Keys</div>
      <div className="settings-section">
        <p className="settings-note">
          Keys are stored as environment variables on the server. Values are never shown — only whether each is configured.
        </p>
        <div className="health-card">
          {rows.map(row => (
            <div key={row.label} className="health-card-row">
              <span className="health-label">{row.label}</span>
              <span>
                <span className={`health-value health-dot ${row.configured ? 'connected' : 'bad'}`} style={{ marginRight: 8 }}>
                  {row.configured ? '● Configured' : '○ Not configured'}
                </span>
                <code style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{row.hint}</code>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function EmailSection() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    adminFetch('/api/admin/subscribers')
      .then(data => setCount(Array.isArray(data) ? data.length : 0))
      .catch(err => console.error('[AdminSettings] Email:', err.message))
  }, [])

  return (
    <>
      <div className="settings-group-header">Email</div>
      <div className="settings-section">
        <p className="settings-note">
          Subscribers are collected automatically when users sign in or join the newsletter. Manage the list under Content &gt; Subscribers.
        </p>
        <div className="health-card">
          <div className="health-card-row">
            <span className="health-label">Total Subscribers</span>
            <span className="health-value">{count === null ? '…' : count}</span>
          </div>
          <div className="health-card-row">
            <span className="health-label">Sources</span>
            <span className="health-value">Sign-in · Newsletter form</span>
          </div>
        </div>
      </div>
    </>
  )
}

function AboutSection() {
  return (
    <>
      <div className="settings-group-header">About</div>
      <div className="settings-section">
        <div className="health-card">
          <div className="health-card-row">
            <span className="health-label">Product</span>
            <span className="health-value">Alaffia CMS</span>
          </div>
          <div className="health-card-row">
            <span className="health-label">Platform</span>
            <span className="health-value">Cultural Concierge</span>
          </div>
          <div className="health-card-row">
            <span className="health-label">Frontend</span>
            <span className="health-value">React + Vite</span>
          </div>
          <div className="health-card-row">
            <span className="health-label">Backend</span>
            <span className="health-value">Node.js + Express + MongoDB</span>
          </div>
          <div className="health-card-row">
            <span className="health-label">Auth</span>
            <span className="health-value">Clerk</span>
          </div>
        </div>
        <p className="settings-note" style={{ marginTop: 8 }}>
          Curated culture, wellness, and social events across Lagos, Abuja, Kigali, and Nairobi.
        </p>
      </div>
    </>
  )
}

export default function AdminSettings() {
  return (
    <div className="settings-page">
      <div className="settings-intro">
        <span className="settings-intro-icon">⚙️</span>
        <div>
          <h2 className="settings-intro-title">Settings</h2>
          <p className="settings-intro-sub">App configuration, access, keys, and product info — all in one place.</p>
        </div>
      </div>
      <GeneralSection />
      <AccountsSection />
      <KeysSection />
      <EmailSection />
      <AdminTags />
      <AboutSection />
    </div>
  )
}
