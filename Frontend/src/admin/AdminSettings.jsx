import { useState, useEffect } from 'react'

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

export default function AdminSettings({ user }) {
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
        <p className="settings-note">
          Admin access is granted via the <code style={{ color: 'var(--admin-copper)', background: 'rgba(180,95,45,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ADMIN_EMAILS</code> environment variable on the server.
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
    </div>
  )
}
