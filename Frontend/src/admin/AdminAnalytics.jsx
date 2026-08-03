import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const PILLAR_STYLES = {
  WELLNESS: { bg: 'rgba(138,154,91,0.15)', text: '#8A9A5B', label: 'Wellness' },
  CULTURE: { bg: 'rgba(180,95,45,0.15)', text: '#B45F2D', label: 'Culture' },
  SOCIAL: { bg: 'rgba(91,138,154,0.15)', text: '#5B8A9A', label: 'Social' },
}

const CITY_COLORS = ['#B45F2D', '#8A9A5B', '#5B8A9A', '#9A5B8A', '#B48A5B', '#5B9A8A']

export default function AdminAnalytics({ onNavigate }) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(setStats)
      .catch(err => console.error('[AdminAnalytics] Stats:', err.message))
  }, [])

  if (!stats) return <p className="admin-empty">Loading analytics...</p>

  const allCities = []
  const seen = new Set()
  for (const c of [...(stats.eventsByCity || []), ...(stats.venuesByCity || [])]) {
    if (!seen.has(c.city)) {
      allCities.push(c)
      seen.add(c.city)
    }
  }
  const cityMax = allCities.length ? Math.max(...allCities.map(c => c.count)) : 1
  const totalContent = stats.pillarBreakdown?.reduce((sum, p) => sum + p.count, 0) || 0

  return (
    <div>
      {stats.eventsThisWeek > 0 && (
        <div className="admin-insights-row" style={{ marginBottom: 28 }}>
          <div className="admin-insight-card">
            <span className="admin-insight-icon">📈</span>
            <div>
              <span className="admin-insight-value">+{stats.eventsThisWeek}</span>
              <span className="admin-insight-label">events this week</span>
            </div>
          </div>
          <div className="admin-insight-card">
            <span className="admin-insight-icon">📊</span>
            <div>
              <span className="admin-insight-value">{allCities.length}</span>
              <span className="admin-insight-label">cities covered</span>
            </div>
          </div>
          <div className="admin-insight-card">
            <span className="admin-insight-icon">🏷️</span>
            <div>
              <span className="admin-insight-value">{totalContent}</span>
              <span className="admin-insight-label">events & venues tracked</span>
            </div>
          </div>
        </div>
      )}

      {/* City Distribution */}
      {allCities.length > 0 && (
        <div className="admin-dashboard-two-col" style={{ marginBottom: 28 }}>
          <div>
            <div className="admin-section-header">
              <h3 className="admin-section-title">City Distribution</h3>
            </div>
            <div className="city-chart">
              {allCities.map((c, i) => (
                <div key={c.city} className="city-chart-row">
                  <span className="city-chart-label">{c.city}</span>
                  <div className="city-chart-track">
                    <div
                      className="city-chart-fill"
                      style={{
                        width: `${Math.max((c.count / cityMax) * 100, 4)}%`,
                        background: CITY_COLORS[i % CITY_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="city-chart-value">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Events by City quick list */}
          <div>
            <div className="admin-section-header">
              <h3 className="admin-section-title">Events by City</h3>
            </div>
            <div className="admin-city-list">
              {(stats.eventsByCity || []).map(c => (
                <div key={c.city} className="admin-city-row">
                  <span>{c.city}</span>
                  <span>{c.count}</span>
                </div>
              ))}
            </div>
            {stats.venuesByCity?.length > 0 && (
              <>
                <div className="admin-section-header" style={{ marginTop: 16 }}>
                  <h3 className="admin-section-title">Venues by City</h3>
                </div>
                <div className="admin-city-list">
                  {stats.venuesByCity.map(c => (
                    <div key={c.city} className="admin-city-row">
                      <span>{c.city}</span>
                      <span>{c.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pillar Breakdown */}
      {stats.pillarBreakdown?.length > 0 && (
        <div style={{ maxWidth: 560, marginBottom: 28 }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Content Balance</h3>
          </div>
          <div className="pillar-breakdown-card">
            {stats.pillarBreakdown.map(p => {
              const s = PILLAR_STYLES[p.pillar] || { bg: 'rgba(255,255,255,0.06)', text: '#888', label: p.pillar }
              const total = stats.pillarBreakdown.reduce((sum, x) => sum + x.count, 0)
              const pct = Math.round((p.count / total) * 100)
              return (
                <div key={p.pillar} className="pillar-row">
                  <div className="pillar-row-header">
                    <span className="pillar-row-label" style={{ color: s.text }}>{s.label}</span>
                    <span className="pillar-row-count">{p.count}</span>
                    <span className="pillar-row-pct">{pct}%</span>
                  </div>
                  <div className="pillar-track">
                    <div className="pillar-fill" style={{ width: `${pct}%`, background: s.text }} />
                  </div>
                </div>
              )
            })}
            <div className="pillar-total">
              {stats.pillarBreakdown.reduce((sum, p) => sum + p.count, 0)} total events & venues
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
