import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const I = {
  calendar: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  pin: <svg viewBox="0 0 24 24" {...S}><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  note: <svg viewBox="0 0 24 24" {...S}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" /><path d="M14 3v6h6M9 13h6M9 17h6" /></svg>,
  flame: <svg viewBox="0 0 24 24" {...S}><path d="M12 21c4 0 7-2.7 7-7 0-3.5-2.5-5.5-4.5-7.5C13 5 12 3 12 3s-.5 2-1.5 3.5C8.5 8.5 5 10.5 5 14c0 4.3 3 7 7 7z" /><path d="M12 21c-1.5 0-2.5-1-2.5-2.5S12 15 12 15s2.5 2 2.5 3.5S13.5 21 12 21z" /></svg>,
  plus: <svg viewBox="0 0 24 24" {...S}><path d="M12 5v14M5 12h14" /></svg>,
  bolt: <svg viewBox="0 0 24 24" {...S}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>,
  chart: <svg viewBox="0 0 24 24" {...S}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>,
}

const STAT_ICONS = {
  totalEvents: { icon: I.calendar, color: 'white', nav: 'events-live' },
  totalVenues: { icon: I.pin, color: 'copper', nav: 'content-venues' },
  ghostEvents: { icon: I.note, color: 'white', nav: 'events-pending' },
  eventsThisWeek: { icon: I.flame, color: 'copper', nav: 'events-live' },
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
        <button className="admin-quick-action" onClick={() => onNavigate('events-add')}>
          <div className="admin-quick-action-icon copper">{I.plus}</div>
          <div className="admin-quick-action-body">
            <h4>Add New Event</h4>
            <p>Create a new event listing</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('tools-scrapers')}>
          <div className="admin-quick-action-icon sage">{I.bolt}</div>
          <div className="admin-quick-action-body">
            <h4>Run Scraper</h4>
            <p>Import events from external sources</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('content-venues')}>
          <div className="admin-quick-action-icon white">{I.pin}</div>
          <div className="admin-quick-action-body">
            <h4>{stats.totalVenues} Venues</h4>
            <p>Manage venues and experiences</p>
          </div>
        </button>
        <button className="admin-quick-action" onClick={() => onNavigate('tools-analytics')}>
          <div className="admin-quick-action-icon copper">{I.chart}</div>
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
