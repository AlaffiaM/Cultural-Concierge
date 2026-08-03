// Admin shell: sidebar nav (4 accordion sections) + main content.
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
import AdminHub from './AdminHub'
import { ToastProvider } from './Toast'

import './AdminDashboard.css'

const SECTION_ICONS = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  content: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  tools: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

const CONTENT_CARDS = [
  { key: 'events-hub', label: 'Events', sub: 'Live, pending, and new events', icon: '📅', tone: 'copper' },
  { key: 'content-venues', label: 'Venues', sub: 'Venue profiles and images', icon: '📍', tone: 'sage' },
  { key: 'content-advisories', label: 'Advisories', sub: 'AI city travel advisories', icon: '🧭', tone: 'white' },
  { key: 'content-subscribers', label: 'Subscribers', sub: 'Email list and signups', icon: '✉️', tone: 'white' },
]

const TOOLS_CARDS = [
  { key: 'tools-scrapers', label: 'Scrapers', sub: 'Run imports per source', icon: '⚡', tone: 'sage' },
  { key: 'tools-analytics', label: 'Analytics', sub: 'City and pillar insights', icon: '📊', tone: 'white' },
  { key: 'tools-import-export', label: 'Import / Export', sub: 'CSV backups', icon: '📦', tone: 'white' },
  { key: 'tools-maintenance', label: 'Maintenance', sub: 'Cleanup and system health', icon: '🧹', tone: 'white' },
]

const EVENTS_CARDS = [
  { key: 'events-live', label: 'Live Events', sub: 'Approved events in the app', icon: '✅', tone: 'sage' },
  { key: 'events-pending', label: 'Pending Approval', sub: 'Scraped events to review', icon: '⏳', tone: 'copper' },
  { key: 'events-add', label: 'Add Event', sub: 'Create a new listing', icon: '➕', tone: 'white' },
  { key: 'events-drafts', label: 'Drafts', sub: 'Saved but unpublished', icon: '📝', tone: 'white', disabled: true, badge: 'Soon' },
]

// Sidebar sections. Sections with `children` are accordions; each child's
// `nav` key maps to a rendered page. Sections without children (dashboard,
// settings) navigate directly when clicked.
const SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: SECTION_ICONS.dashboard,
  },
  {
    key: 'content',
    label: 'Content',
    icon: SECTION_ICONS.content,
    children: [
      { key: 'content-events', label: 'Events', icon: '📅', nav: 'events-hub' },
      { key: 'content-venues', label: 'Venues', icon: '📍', nav: 'content-venues' },
      { key: 'content-advisories', label: 'Advisories', icon: '🧭', nav: 'content-advisories' },
      { key: 'content-subscribers', label: 'Subscribers', icon: '✉️', nav: 'content-subscribers' },
    ],
  },
  {
    key: 'tools',
    label: 'Tools',
    icon: SECTION_ICONS.tools,
    children: [
      { key: 'tools-scrapers', label: 'Scrapers', icon: '⚡', nav: 'tools-scrapers' },
      { key: 'tools-analytics', label: 'Analytics', icon: '📊', nav: 'tools-analytics' },
      { key: 'tools-import-export', label: 'Import / Export', icon: '📦', nav: 'tools-import-export' },
      { key: 'tools-maintenance', label: 'Maintenance', icon: '🧹', nav: 'tools-maintenance' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: SECTION_ICONS.settings,
  },
]

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  content: 'Content',
  tools: 'Tools',
  settings: 'Settings',
  'events-hub': 'Events',
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
  content: 'Everything you manage manually',
  tools: 'Automation and system utilities',
  settings: 'Configuration',
  'events-hub': 'Live, pending, and new events',
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

function sectionFor(tab) {
  return SECTIONS.find(s =>
    s.key === tab || (s.children || []).some(c => c.nav === tab)
  )
}

export default function AdminDashboard({ onBackToApp, user }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openSection, setOpenSection] = useState('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function go(tab) {
    setActiveTab(tab)
    const section = sectionFor(tab)
    if (section?.children) setOpenSection(section.key)
    setMobileNavOpen(false)
  }

  const activeSection = sectionFor(activeTab)?.key

  function renderPage() {
    switch (activeTab) {
      case 'dashboard': return <AdminOverview onNavigate={go} />
      case 'content': return <AdminHub cards={CONTENT_CARDS} onNavigate={go} />
      case 'tools': return <AdminHub cards={TOOLS_CARDS} onNavigate={go} />
      case 'settings': return <AdminSettings user={user} />
      case 'events-hub': return <AdminHub cards={EVENTS_CARDS} onNavigate={go} />
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
          {SECTIONS.map(section => {
            const isOpen = openSection === section.key
            const sectionActive = activeSection === section.key
            return (
              <div key={section.key} className="admin-nav-section">
                <div
                  className={`admin-nav-section-header ${sectionActive ? 'active' : ''}`}
                  onClick={() => go(section.key)}
                >
                  <span className="admin-nav-section-icon">{section.icon}</span>
                  <span className="admin-nav-section-label">{section.label}</span>
                  {section.children && (
                    <button
                      className="admin-nav-chevron"
                      onClick={e => { e.stopPropagation(); setOpenSection(isOpen ? null : section.key) }}
                      aria-label={`Toggle ${section.label}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  )}
                </div>

                {section.children && isOpen && (
                  <div className="admin-nav-children">
                    {section.children.map(child => (
                      <button
                        key={child.key}
                        className={`admin-sidebar-item admin-nav-child ${activeTab === child.nav ? 'active' : ''}`}
                        onClick={() => go(child.nav)}
                      >
                        <span className="admin-nav-child-icon">{child.icon}</span>
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
