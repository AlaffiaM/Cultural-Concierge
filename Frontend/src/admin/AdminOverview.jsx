import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const STAT_ICONS = {
  totalEvents: { icon: '📅', color: 'white', nav: 'live-events' },
  totalVenues: { icon: '📍', color: 'copper', nav: 'venues' },
  ghostEvents: { icon: '📝', color: 'white', nav: 'pending-events' },
  eventsThisWeek: { icon: '🔥', color: 'copper', nav: 'live-events' },
}

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(setStats)
      .catch(err => console.error('[AdminOverview] Stats:', err.message))
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
        <button className="admin-quick-action" onClick={() => onNavigate('analytics')}>
          <div className="admin-quick-action-icon copper">📊</div>
          <div className="admin-quick-action-body">
            <h4>View Analytics</h4>
            <p>City distribution and content balance</p>
          </div>
        </button>
      </div>
    </div>
  )
}
