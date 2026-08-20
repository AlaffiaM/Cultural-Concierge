import { useState } from 'react'
import { adminFetch } from './adminApi'
import { useToast } from './Toast'
import SelectAllCheckbox from './components/SelectAllCheckbox'

const SOURCE_LABELS = {
  gemini: 'AI Research',
}

export default function AdminVenueScraper() {
  const [scraperRunning, setScraperRunning] = useState(null)
  const [scraperResults, setScraperResults] = useState(null)
  const [scraperSelected, setScraperSelected] = useState(new Set())
  const [accepting, setAccepting] = useState(false)
  const [venueExpanded, setVenueExpanded] = useState(new Set())
  const [existingVenues, setExistingVenues] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const { addToast } = useToast()

  async function handleRunScraper(source) {
    setScraperRunning(source)
    setScraperResults(null)
    setScraperSelected(new Set())
    setExistingVenues(null)
    try {
      const res = await adminFetch('/api/venues/scraper/run', {
        method: 'POST',
        body: JSON.stringify({ source }),
      })
      setScraperResults(res)
      addToast(`${source} scraper: ${res.new} new, ${res.skipped} skipped`, res.new > 0 ? 'success' : 'info')
      if (res.venues.length === 0) loadExistingScraped()
    } catch (err) {
      addToast(`${source} scraper failed: ${err.message}`, 'error')
    } finally {
      setScraperRunning(null)
    }
  }

  async function loadExistingScraped() {
    setLoadingExisting(true)
    try {
      const all = await adminFetch('/api/venues?all=true')
      setExistingVenues((all.venues || all).filter(s => ['gemini'].includes(s.source) && s.status === 'scraped'))
      setScraperSelected(new Set())
    } catch (err) {
      console.error('[AdminVenueScraper] Load existing failed:', err.message)
      addToast('Failed to load existing scraped venues', 'error')
    } finally {
      setLoadingExisting(false)
    }
  }

  function toggleScraperSelect(id) {
    setScraperSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllScraper(items) {
    if (!items?.length) return
    if (scraperSelected.size === items.length) {
      setScraperSelected(new Set())
    } else {
      setScraperSelected(new Set(items.map(s => s._id)))
    }
  }

  async function handleAccept(idsOverride) {
    const ids = idsOverride || Array.from(scraperSelected)
    if (ids.length === 0) return
    setAccepting(true)
    try {
      await adminFetch('/api/venues/scraper/accept', {
        method: 'POST',
        body: JSON.stringify({ venueIds: ids }),
      })
      const updateList = list =>
        list.map(s => (ids.includes(s._id) ? { ...s, status: 'inactive' } : s))
      if (scraperResults?.venues) {
        setScraperResults(prev => ({ ...prev, venues: updateList(prev.venues) }))
      }
      if (existingVenues) {
        setExistingVenues(prev => updateList(prev))
      }
      setScraperSelected(new Set())
      addToast(`${ids.length} venue(s) accepted`, 'success')
    } catch (err) {
      console.error('[AdminVenueScraper] Accept failed:', err.message)
      addToast('Failed to accept venues', 'error')
    } finally {
      setAccepting(false)
    }
  }

  function renderTable(items, title) {
    const selectableItems = items.filter(s => s.status === 'scraped')
    return (
      <div>
        <div className="admin-toolbar" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
            {title} ({items.length})
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => handleAccept()}
              disabled={scraperSelected.size === 0 || accepting}
              style={{ padding: '4px 14px', fontSize: 12 }}
            >
              {accepting ? 'Accepting...' : `Accept (${scraperSelected.size})`}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>
                  <SelectAllCheckbox
                    checked={selectableItems.length > 0 && scraperSelected.size === selectableItems.length}
                    indeterminate={scraperSelected.size > 0 && scraperSelected.size < selectableItems.length}
                    onChange={() => selectAllScraper(selectableItems)}
                  />
                </th>
                <th style={{ width: 180 }}>Images</th>
                <th>Venue</th>
                <th>Address</th>
                <th>City</th>
                <th>Tags</th>
                <th>Source</th>
                <th style={{ width: 80 }}>Accept</th>
              </tr>
            </thead>
            <tbody>
              {items.map(venue => {
                const canAccept = venue.status === 'scraped'
                return (
                  <tr key={venue._id}>
                    <td>
                      {canAccept && (
                        <input
                          type="checkbox"
                          checked={scraperSelected.has(venue._id)}
                          onChange={() => toggleScraperSelect(venue._id)}
                          style={{ accentColor: 'var(--admin-copper)' }}
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {venue.images?.slice(0, 5).map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                            <img
                              src={img}
                              alt=""
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          </a>
                        ))}
                        {(!venue.images || venue.images.length === 0) && (
                          <div style={{ width: 50, height: 50, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                        )}
                        {venue.images?.length > 5 && (
                          <span style={{ fontSize: 10, color: 'var(--admin-text-muted)', alignSelf: 'flex-end' }}>
                            +{venue.images.length - 5}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{venue.name}</td>
                    <td
                      style={{ color: 'var(--admin-text-muted)', fontSize: 11, cursor: venue.address ? 'pointer' : 'default', maxWidth: 160 }}
                      onClick={() => {
                        if (!venue.address) return
                        setVenueExpanded(prev => {
                          const next = new Set(prev)
                          next.has(venue._id) ? next.delete(venue._id) : next.add(venue._id)
                          return next
                        })
                      }}
                      title={venueExpanded.has(venue._id) ? '' : venue.address}
                    >
                      {venueExpanded.has(venue._id) ? venue.address : (venue.address?.slice(0, 30) || '—')}
                    </td>
                    <td>{venue.city}</td>
                    <td style={{ fontSize: 11 }}>
                      {(venue.tags || []).slice(0, 3).join(', ')}
                      {venue.tags?.length > 3 && '...'}
                    </td>
                    <td>
                      <span className="admin-status-badge" style={{ background: 'rgba(180,95,45,0.15)', color: '#B45F2D' }}>
                        {SOURCE_LABELS[venue.source] || venue.source}
                      </span>
                    </td>
                    <td>
                      {canAccept ? (
                        <button
                          className="admin-btn-sm admin-btn-approve"
                          onClick={() => {
                            setScraperSelected(new Set([venue._id]))
                            handleAccept([venue._id])
                          }}
                          disabled={accepting}
                        >
                          Accept
                        </button>
                      ) : (
                        <span className="admin-status-badge admin-status-inactive">Accepted</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-quick-actions" style={{ marginBottom: 12 }}>
        <button
          className={`admin-quick-action${scraperRunning === 'gemini' ? ' loading' : ''}`}
          onClick={() => handleRunScraper('gemini')}
          disabled={scraperRunning !== null}
        >
          <div className="admin-quick-action-icon sage">
            {scraperRunning === 'gemini' ? <div className="admin-spinner" /> : '🤖'}
          </div>
          <div className="admin-quick-action-body">
            <h4>{scraperRunning === 'gemini' ? 'Researching...' : 'AI Research Venues'}</h4>
            <p>Gemini searches Google for cultural + wellness venues</p>
          </div>
        </button>
      </div>

      {scraperResults && scraperResults.venues?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {renderTable(scraperResults.venues, `New: ${scraperResults.source} — ${scraperResults.fetched} found, ${scraperResults.new} new (${scraperResults.skipped} skipped)`)}
        </div>
      )}

      {scraperResults && scraperResults.venues?.length === 0 && !existingVenues && (
        <div className="admin-stat-card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0 0 12px 0' }}>
            No new venues found — all already in the database.
          </p>
          <button className="admin-btn admin-btn-secondary" onClick={loadExistingScraped} disabled={loadingExisting}>
            {loadingExisting ? 'Loading...' : 'Browse existing scraped venues'}
          </button>
        </div>
      )}

      {existingVenues && existingVenues.length > 0 && (
        <div>
          {renderTable(existingVenues, 'Existing scraped venues')}
        </div>
      )}

      {existingVenues && existingVenues.length === 0 && (
        <div className="admin-stat-card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>
            No scraped venues in the database.
          </p>
        </div>
      )}
    </div>
  )
}
