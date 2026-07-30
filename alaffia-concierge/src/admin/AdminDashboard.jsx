import { useState } from 'react'
import AdminOverview from './AdminOverview'
import AdminEvents from './AdminEvents'
import AdminPendingEvents from './AdminPendingEvents'
import AdminVenues from './AdminVenues'
import AdminTags from './AdminTags'
import AdminSettings from './AdminSettings'
import AdminScraper from './AdminScraper'
import AdminSubscribers from './AdminSubscribers'
import AdminAdvisories from './AdminAdvisories'
import { ToastProvider } from './Toast'

import './AdminDashboard.css'

const TABS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    key: 'live-events',
    label: 'Live Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    key: 'pending-events',
    label: 'Pending Events',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    key: 'venues',
    label: 'Venues',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    key: 'tags',
    label: 'Tags',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  },
  {
    key: 'subscribers',
    label: 'Subscribers',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
  {
    key: 'scraper',
    label: 'Scraper',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    key: 'advisories',
    label: 'Advisories',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
]

const PAGE_TITLES = {
  overview: 'Dashboard',
  'live-events': 'Live Events',
  'pending-events': 'Pending Events',
  venues: 'Venues',
  tags: 'Tags',
  subscribers: 'Subscribers',
  settings: 'Settings',
  scraper: 'Scraper',
  advisories: 'Advisories',
}

const PAGE_SUBTITLES = {
  overview: 'Overview of your content and activity',
  'live-events': 'Approved events (venues + pop-ups) visible in the app',
  'pending-events': 'Scraped events awaiting approval',
  venues: 'Manage venues',
  tags: 'Tag taxonomy and keyword system',
  subscribers: 'Email subscribers collected via sign-in and newsletter forms',
  settings: 'Admin access and environment info',
  scraper: 'Import events from Ticketsasa, Kenyabuzz, and Mookh',
  advisories: 'Generate and refresh AI-powered travel advisories',
}

export default function AdminDashboard({ onBackToApp, user }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <h1>Alaffia CMS</h1>
          <span>Cultural Concierge</span>
        </div>

        <div className="admin-sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`admin-sidebar-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
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
            <div>
              <h2 className="admin-main-title">{PAGE_TITLES[activeTab]}</h2>
              <p className="admin-main-subtitle">{PAGE_SUBTITLES[activeTab]}</p>
            </div>
          </div>

          {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
          {activeTab === 'live-events' && <AdminEvents />}
          {activeTab === 'pending-events' && <AdminPendingEvents />}
          {activeTab === 'venues' && <AdminVenues />}
          {activeTab === 'tags' && <AdminTags />}
          {activeTab === 'subscribers' && <AdminSubscribers />}
          {activeTab === 'settings' && <AdminSettings user={user} />}
          {activeTab === 'scraper' && <AdminScraper />}
          {activeTab === 'advisories' && <AdminAdvisories />}
        </ToastProvider>
      </div>
    </div>
  )
}
