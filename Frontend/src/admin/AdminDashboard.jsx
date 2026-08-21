// Admin shell: flat sidebar nav + main content.
// Below 900px the sidebar becomes a slide-in drawer (see .admin-sidebar in CSS).
import { useState } from 'react'
import AdminOverview from './AdminOverview'
import AdminEvents from './AdminEvents'
import AdminPendingEvents from './AdminPendingEvents'
import AdminAddEvent from './AdminAddEvent'
import AdminVenues from './AdminVenues'
import AdminSettings from './AdminSettings'
import AdminScraper from './AdminScraper'
import AdminSubscribers from './AdminSubscribers'
import AdminAdvisories from './AdminAdvisories'
import AdminAnalytics from './AdminAnalytics'
import AdminMaintenance from './AdminMaintenance'
import { ToastProvider } from './Toast'

import './AdminDashboard.css'

// Flat sidebar nav. Every item navigates directly to its page — no
// accordions, no hub/landing pages.
const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { tab: 'events-live', label: 'Live Events', icon: '✅' },
  { tab: 'events-pending', label: 'Pending Approval', icon: '⏳' },
  { tab: 'events-add', label: 'Add Event', icon: '➕' },
  { tab: 'content-venues', label: 'Venues', icon: '📍' },
  { tab: 'content-advisories', label: 'Advisories', icon: '🧭' },
  { tab: 'content-subscribers', label: 'Subscribers', icon: '✉️' },
  { tab: 'tools-scrapers', label: 'Scrapers', icon: '⚡' },
  { tab: 'tools-analytics', label: 'Analytics', icon: '📊' },
  { tab: 'tools-import-export', label: 'Import / Export', icon: '📦' },
  { tab: 'tools-maintenance', label: 'Maintenance', icon: '🧹' },
  { tab: 'settings', label: 'Settings', icon: '⚙️' },
]

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  'content-venues': 'Venues',
  'content-advisories': 'Advisories',
  'content-subscribers': 'Subscribers',
  'tools-scrapers': 'Scrapers',
  'tools-analytics': 'Analytics',
  'tools-import-export': 'Import / Export',
  'tools-maintenance': 'Maintenance',
  'events-live': 'Live Events',
  'events-pending': 'Pending Approval',
  'events-add': 'Add Event',
}

const PAGE_SUBTITLES = {
  dashboard: 'Overview of your content and activity',
  settings: 'Configuration',
  'content-venues': 'Manage venues and experiences',
  'content-advisories': 'Generate and refresh AI-powered travel advisories',
  'content-subscribers': 'Email subscribers collected via sign-in and newsletter forms',
  'tools-scrapers': 'Import events from Ticketsasa, KenyaBuzz, Mookh, and Eventbrite',
  'tools-analytics': 'City distribution, pillar breakdown, and weekly activity',
  'tools-import-export': 'Download CSV backups of your content',
  'tools-maintenance': 'Danger-zone actions and system health',
  'events-live': 'Approved events (venues + pop-ups) visible in the app',
  'events-pending': 'Scraped events awaiting approval',
  'events-add': 'Create a new event manually',
}

export default function AdminDashboard({ onBackToApp, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function go(tab) {
    setActiveTab(tab)
    setMobileNavOpen(false)
  }

  function renderPage() {
    switch (activeTab) {
      case 'dashboard': return <AdminOverview onNavigate={go} />
      case 'settings': return <AdminSettings user={user} />
      case 'content-venues': return <AdminVenues />
      case 'content-advisories': return <AdminAdvisories />
      case 'content-subscribers': return <AdminSubscribers />
      case 'tools-scrapers': return <AdminScraper />
      case 'tools-analytics': return <AdminAnalytics />
      case 'tools-import-export': return <AdminMaintenance exportOnly />
      case 'tools-maintenance': return <AdminMaintenance />
      case 'events-live': return <AdminEvents />
      case 'events-pending': return <AdminPendingEvents />
      case 'events-add': return <AdminAddEvent onClose={() => go('events-live')} />
      default: return <AdminOverview onNavigate={go} />
    }
  }

  return (
    <div className="admin-layout">
      {mobileNavOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}
      <nav className={`admin-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <h1>Alaffia CMS</h1>
          <span>Cultural Concierge</span>
        </div>

        <div className="admin-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.tab}
              className={`admin-sidebar-item ${activeTab === item.tab ? 'active' : ''}`}
              onClick={() => go(item.tab)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-back" onClick={onBackToApp}>
            ← Back to App
          </button>
          <div className="admin-sidebar-user">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" className="admin-sidebar-user-avatar" />
            )}
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">{user?.fullName || 'Admin'}</div>
              <div className="admin-sidebar-user-email">{user?.primaryEmailAddress?.emailAddress || ''}</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="admin-main">
        <ToastProvider>
          <div className="admin-main-header">
            <button
              className="admin-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h2 className="admin-main-title">{PAGE_TITLES[activeTab]}</h2>
              <p className="admin-main-subtitle">{PAGE_SUBTITLES[activeTab]}</p>
            </div>
          </div>

          {renderPage()}
        </ToastProvider>
      </div>
    </div>
  )
}
