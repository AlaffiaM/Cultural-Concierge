import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const STAT_ICONS = {
  totalEvents: { icon: '📅', color: 'white', nav: 'events-live' },
  totalVenues: { icon: '📍', color: 'copper', nav: 'content-venues' },
  ghostEvents: { icon: '📝', color: 'white', nav: 'events-pending' },
  eventsThisWeek: { icon: '🔥', color: 'copper', nav: 'events-live' },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recentEvents, setRecentEvents] = useState([])
  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(setStats)
      .catch(err => console.error('[AdminOverview] Stats:', err.message))

    adminFetch('/api/events?limit=8')
      .then(data => setRecentEvents(data.events || []))
      .catch(() => {})
  }, [])

  if (!stats) return <p className="admin-empty">Loading dashboard...</p>

  const statEntries = [
    { key: 'totalEvents', label: 'Total Events' },
    { key: 'totalVenues', label: 'Total Venues' },
    { key: 'ghostEvents', label: 'Ghost Events', tooltip: 'Pop-up events with no fixed venue' },
    { key: 'eventsThisWeek', label: 'Events This Week' },
  ]

  return (
    <div>
      <div className="admin-stats-grid">
        {statEntries.map(({ key, label, tooltip }) => {
          const meta = STAT_ICONS[key]
          return (
            <div
              key={key}
              className="admin-stat-card admin-stat-card-clickable"
              onClick={() => onNavigate(meta?.nav || 'events')}
            >
              <div className="admin-stat-header">
                <div className={`admin-stat-icon ${meta?.color || 'white'}`}>
                  {meta?.icon || '•'}
                </div>
              </div>
              <div className="admin-stat-number">{stats[key] ?? 0}</div>
              <div className="admin-stat-label">
                {label}
                {tooltip && (
                  <span className="tooltip-icon" data-tooltip={tooltip}>?</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="admin-quick-actions" style={{ marginBottom: 28 }}>
        <button className="admin-quick-action" onClick={() => onNavigate('add-event')}>
          <div className="admin-quick-action-icon copper">➕</div>
          <div className="admin-quick-action-body">
            <h4>Add New Event</h4>
            <p>Create a new event listing</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('scraper')}>
          <div className="admin-quick-action-icon sage">⚡</div>
          <div className="admin-quick-action-body">
            <h4>Run Scraper</h4>
            <p>Import events from external sources</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('venues')}>
          <div className="admin-quick-action-icon white">📍</div>
          <div className="admin-quick-action-body">
            <h4>{stats.totalVenues} Venues</h4>
            <p>Manage venues and experiences</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('tools-analytics')}>
          <div className="admin-quick-action-icon copper">📊</div>
          <div className="admin-quick-action-body">
            <h4>View Analytics</h4>
            <p>City distribution and content balance</p>
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <div style={{ maxWidth: 720, marginBottom: 28 }}>
          <div className="admin-section-header">
            <h3 className="admin-section-title">Recent Activity</h3>
          </div>
          <div className="admin-activity-feed">
            {recentEvents.map(ev => (
              <div key={ev._id} className="admin-activity-item hover-row clickable" onClick={() => onNavigate('events-live')}>
                <div className={`admin-activity-dot ${ev.status === 'approved' ? 'sage' : 'copper'}`} />
                <div className="admin-activity-body">
                  <span className="admin-activity-name">{ev.name}</span>
                  <span className="admin-activity-meta">
                    {ev.venue && <span className="admin-activity-venue">{ev.venue}</span>}
                    <span>{ev.city || '—'}</span>
                  </span>
                </div>
                <span className="admin-activity-date">{formatDate(ev.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
