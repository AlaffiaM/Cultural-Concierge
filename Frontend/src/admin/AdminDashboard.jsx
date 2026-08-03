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

const TABS = [
  {
    key: 'overview',
    label: 'Dashboard',
    group: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    key: 'live-events',
    label: 'Live Events',
    group: 'Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    key: 'pending-events',
    label: 'Pending Approval',
    group: 'Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    key: 'add-event',
    label: 'Add Event',
    group: 'Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
  },
  {
    key: 'venues',
    label: 'Venues',
    group: 'Venues',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    key: 'subscribers',
    label: 'Subscribers',
    group: 'Subscribers',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  },
  {
    key: 'scraper',
    label: 'Scraper',
    group: 'Scrapers',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    key: 'advisories',
    label: 'Advisories',
    group: 'Scrapers',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    group: 'Analytics',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    key: 'maintenance',
    label: 'Scraped Events',
    group: 'Maintenance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    key: 'export',
    label: 'Export Data',
    group: 'Maintenance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  },
  {
    key: 'settings',
    label: 'Settings',
    group: 'Settings',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

const PAGE_TITLES = {
  overview: 'Dashboard',
  'live-events': 'Live Events',
  'pending-events': 'Pending Events',
  'add-event': 'Add Event',
  venues: 'Venues',
  subscribers: 'Subscribers',
  scraper: 'Scraper',
  advisories: 'Advisories',
  analytics: 'Analytics',
  maintenance: 'Scraped Events',
  export: 'Export Data',
  settings: 'Settings',
}

const PAGE_SUBTITLES = {
  overview: 'Overview of your content and activity',
  'live-events': 'Approved events (venues + pop-ups) visible in the app',
  'pending-events': 'Scraped events awaiting approval',
  'add-event': 'Create a new event manually',
  venues: 'Manage venues',
  subscribers: 'Email subscribers collected via sign-in and newsletter forms',
  scraper: 'Import events from Ticketsasa, Kenyabuzz, and Mookh',
  advisories: 'Generate and refresh AI-powered travel advisories',
  analytics: 'City distribution, pillar breakdown, and weekly activity',
  maintenance: 'Danger-zone actions',
  export: 'Download CSV backups of your content',
  settings: 'Admin access and environment info',
}

export default function AdminDashboard({ onBackToApp, user }) {
  const [activeTab, setActiveTab] = useState('overview')

  let lastGroup = null

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <h1>Alaffia CMS</h1>
          <span>Cultural Concierge</span>
        </div>

        <div className="admin-sidebar-nav">
          {TABS.map(tab => {
            const showGroup = tab.group !== lastGroup
            lastGroup = tab.group
            return (
              <div key={tab.key}>
                {showGroup && <div className="admin-nav-group">{tab.group}</div>}
                <button
                  className={`admin-sidebar-item ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
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
            <div>
              <h2 className="admin-main-title">{PAGE_TITLES[activeTab]}</h2>
              <p className="admin-main-subtitle">{PAGE_SUBTITLES[activeTab]}</p>
            </div>
          </div>

          {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
          {activeTab === 'live-events' && <AdminEvents />}
          {activeTab === 'pending-events' && <AdminPendingEvents />}
          {activeTab === 'add-event' && <AdminAddEvent onClose={() => setActiveTab('live-events')} />}
          {activeTab === 'venues' && <AdminVenues />}
          {activeTab === 'subscribers' && <AdminSubscribers />}
          {activeTab === 'settings' && <AdminSettings user={user} />}
          {activeTab === 'scraper' && <AdminScraper />}
          {activeTab === 'advisories' && <AdminAdvisories />}
          {activeTab === 'analytics' && <AdminAnalytics />}
          {activeTab === 'maintenance' && <AdminMaintenance onNavigate={setActiveTab} />}
          {activeTab === 'export' && <AdminMaintenance exportOnly onNavigate={setActiveTab} />}
        </ToastProvider>
      </div>
    </div>
  )
}
