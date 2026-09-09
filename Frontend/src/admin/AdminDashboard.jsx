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
const ICONS = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5 11-11" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  compass: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 7l9 6 9-6" /></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>,
  wrench: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7z" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></svg>,
};

const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { tab: 'events-live', label: 'Live Events', icon: 'check' },
  { tab: 'events-pending', label: 'Pending Approval', icon: 'clock' },
  { tab: 'events-add', label: 'Add Event', icon: 'plus' },
  { tab: 'content-venues', label: 'Venues', icon: 'pin' },
  { tab: 'content-advisories', label: 'Advisories', icon: 'compass' },
  { tab: 'content-subscribers', label: 'Subscribers', icon: 'mail' },
  { tab: 'tools-scrapers', label: 'Scrapers', icon: 'bolt' },
  { tab: 'tools-analytics', label: 'Analytics', icon: 'chart' },
  { tab: 'tools-import-export', label: 'Import / Export', icon: 'box' },
  { tab: 'tools-maintenance', label: 'Maintenance', icon: 'wrench' },
  { tab: 'settings', label: 'Settings', icon: 'gear' },
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
              <span className="admin-nav-icon">{ICONS[item.icon]}</span>
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
