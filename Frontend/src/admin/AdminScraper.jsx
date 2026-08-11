import { useState, useRef, useEffect } from 'react'
import { adminFetch } from './adminApi'
import AdminVenueScraper from './AdminVenueScraper'

const SOURCES = ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite', 'tixafrica']

const SOURCE_LABELS = {
  ticketsasa: 'Ticketsasa',
  kenyabuzz: 'KenyaBuzz',
  mookh: 'Mookh',
  eventbrite: 'Eventbrite',
  tixafrica: 'Tix Africa',
}

const SOURCE_COLORS = {
  ticketsasa: '#B45F2D',
  kenyabuzz: '#8A9A5B',
  mookh: '#5B8A9A',
  eventbrite: '#9A5B8A',
  tixafrica: '#3a6b8a',
}

function sanitize(text) {
  if (!text) return text
  let s = String(text)
  s = s.replace(/\n\s+at\s+.+/g, '')
  s = s.replace(/(api[_-]?key|apikey|secret|password|token|auth)['":]?\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{8,}['"]?/gi, '$1: [REDACTED]')
  s = s.replace(/mongodb(?:\+srv)?:\/\/[^\s'"]+/g, 'mongodb://[REDACTED]')
  s = s.replace(/https?:\/\/[^:]+:[^@]+@/g, 'https://[REDACTED]@')
  s = s.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/g, 'Bearer [REDACTED]')
  s = s.replace(/Authorization['":]?\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]+['"]?/gi, 'Authorization: [REDACTED]')
  return s.trim()
}

function humanSummary(log) {
  const label = SOURCE_LABELS[log.source] || log.source
  if (log.type === 'start') return `${label}: Fetching events...`
  if (log.type === 'error') return `${label}: Import failed`
  if (log.type === 'success') {
    const n = log.message.match(/(\d+)\s+new/)
    const num = n ? n[1] : '0'
    return `${label}: ${num} events imported`
  }
  return `${label}: ${log.message}`
}

function StatusIcon({ type }) {
  if (type === 'start') {
    return (
      <div className="sf-icon sf-icon-running">
        <div className="sf-spinner" />
      </div>
    )
  }
  if (type === 'success') {
    return (
      <div className="sf-icon sf-icon-success">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (type === 'error') {
    return (
      <div className="sf-icon sf-icon-error">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  return null
}

export default function AdminScraper() {
  const [sourceStatus, setSourceStatus] = useState({})
  const [results, setResults] = useState(null)
  const [logs, setLogs] = useState([])
  const [devMode, setDevMode] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [history, setHistory] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedErrors, setExpandedErrors] = useState(new Set())
  const logEndRef = useRef(null)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  function addLog(source, message, type) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogs(prev => [...prev, { time, source, message: sanitize(message), type }])
  }

  function getStatus(src) {
    return sourceStatus[src] || { state: 'idle', count: 0 }
  }

  function setStatus(src, status) {
    setSourceStatus(prev => ({ ...prev, [src]: status }))
  }

  function toggleError(id) {
    setExpandedErrors(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function systemHealth() {
    const states = SOURCES.map(s => getStatus(s).state)
    const errors = states.filter(s => s === 'error').length
    const running = states.filter(s => s === 'running').length
    if (errors > 0) return { status: 'error', label: `${errors} source${errors > 1 ? 's' : ''} with errors`, color: '#dc3232' }
    if (running > 0) return { status: 'running', label: 'Scraping in progress...', color: '#f0b429' }
    return { status: 'healthy', label: 'All sources operational', color: '#8A9A5B' }
  }

  async function handleRun(source) {
    const sources = source ? [source] : SOURCES

    for (const src of sources) {
      const s = getStatus(src)
      if (s.state === 'running') continue

      setStatus(src, { state: 'running', count: 0 })
      addLog(src, 'Fetching events...', 'start')

      try {
        const res = await adminFetch('/api/scraper/run', {
          method: 'POST',
          body: JSON.stringify({ source: src }),
        })

        const r = res.results?.[src]
        const newCount = r?.new || 0
        const skipped = r?.skipped || 0
        const rejected = r?.rejected || 0

        if (r?.error) {
          setStatus(src, { state: 'error', count: 0, error: r.error })
          addLog(src, r.error, 'error')
        } else {
          setStatus(src, { state: 'done', count: newCount, fetched: r.fetched, skipped, rejected })
          addLog(src, `${newCount} new, ${skipped} skipped${rejected ? `, ${rejected} rejected` : ''}`, 'success')
        }

        setResults(res)
        setLastRefresh(new Date())
      } catch (err) {
        setStatus(src, { state: 'error', count: 0, error: err.message })
        addLog(src, err.message, 'error')
        setLastRefresh(new Date())
      }
    }
  }

  async function loadHistory() {
    try {
      const data = await adminFetch('/api/scraper/history?limit=20')
      setHistory(data)
      setShowHistory(true)
    } catch (err) {
      console.error('[AdminScraper] History failed:', err.message)
    }
  }

  function formatDate(d) {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const anyRunning = SOURCES.some(s => getStatus(s).state === 'running')
  const health = systemHealth()
  const totalNew = results ? Object.values(results.results || {}).reduce((sum, r) => sum + (r.new || 0), 0) : 0
  const totalFetched = results ? Object.values(results.results || {}).reduce((sum, r) => sum + (r.fetched || 0), 0) : 0
  const totalRejected = results ? Object.values(results.results || {}).reduce((sum, r) => sum + (r.rejected || 0), 0) : 0

  function StatusDot({ state }) {
    const colors = { idle: '#444', running: '#f0b429', done: '#8A9A5B', error: '#dc3232' }
    return (
      <span style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[state] || colors.idle,
        boxShadow: state === 'running' ? `0 0 8px ${colors.running}` : 'none',
        animation: state === 'running' ? 'scraper-pulse-dot 1.2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
    )
  }

  function ProgressBar({ state }) {
    if (state === 'idle') return null
    const isRunning = state === 'running'
    const isError = state === 'error'
    return (
      <div style={{
        width: '100%',
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        marginTop: 8,
      }}>
        <div style={{
          width: isRunning ? '60%' : '100%',
          height: '100%',
          borderRadius: 2,
          background: isError ? '#dc3232' : '#8A9A5B',
          animation: isRunning ? 'scraper-progress-indeterminate 1.5s ease-in-out infinite' : 'none',
          transition: 'width 0.4s ease',
        }} />
      </div>
    )
  }

  return (
    <div className="scraper-page">

      {/* ── Sources ── */}
      <div className="settings-group-header">Sources</div>

      <div style={{ marginBottom: 20 }}>
        <button
          className="admin-quick-action"
          onClick={() => handleRun(null)}
          disabled={anyRunning}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px',
            border: '1px solid var(--admin-border)', borderRadius: 10,
            background: anyRunning ? 'rgba(255,255,255,0.03)' : 'var(--admin-card)',
            color: 'var(--admin-text)', cursor: anyRunning ? 'not-allowed' : 'pointer',
            opacity: anyRunning ? 0.5 : 1, transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: anyRunning ? 'rgba(240,180,41,0.15)' : 'rgba(180,95,45,0.2)',
            fontSize: 16,
          }}>
            {anyRunning ? <div className="admin-spinner" /> : '⚡'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{anyRunning ? 'Scraping...' : 'Run All Sources'}</div>
            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{anyRunning ? 'Processing...' : 'Import events from all sources'}</div>
          </div>
        </button>
      </div>

      <div className="admin-stats-grid scraper-cards" style={{ marginBottom: 32 }}>
        {SOURCES.map(src => {
          const status = getStatus(src)
          return (
            <div
              key={src}
              className="admin-stat-card scraper-source-card"
              style={{
                borderColor: status.state === 'running' ? 'rgba(240,180,41,0.3)' : status.state === 'done' ? 'rgba(138,154,91,0.3)' : status.state === 'error' ? 'rgba(220,50,50,0.3)' : undefined,
                transition: 'all 0.3s ease',
              }}
            >
              <div className="admin-stat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <StatusDot state={status.state} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{SOURCE_LABELS[src]}</span>
                  <button
                    onClick={() => handleRun(src)}
                    disabled={status.state === 'running'}
                    style={{
                      marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                      background: status.state === 'running' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      color: 'var(--admin-text)', fontSize: 11, cursor: status.state === 'running' ? 'not-allowed' : 'pointer',
                      opacity: status.state === 'running' ? 0.4 : 1, transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {status.state === 'running' ? (
                      <div className="admin-spinner" style={{ width: 12, height: 12 }} />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 1.5v9l7-4.5L3 1.5z" fill="currentColor" />
                      </svg>
                    )}
                    {status.state === 'running' ? '...' : 'Run'}
                  </button>
                </div>
              </div>

              <ProgressBar state={status.state} />

              {status.state !== 'idle' && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  {status.state === 'running' && <span>Fetching events...</span>}
                  {status.state === 'done' && (
                    <span>
                      <span style={{ color: '#8A9A5B', fontWeight: 600 }}>{status.count} new</span>
                      {status.fetched !== undefined && <span style={{ marginLeft: 8 }}>{status.fetched} found</span>}
                      {status.skipped > 0 && <span style={{ marginLeft: 8, opacity: 0.6 }}>{status.skipped} dupes</span>}
                      {status.rejected > 0 && <span style={{ marginLeft: 8, opacity: 0.6 }}>{status.rejected} filtered</span>}
                    </span>
                  )}
                  {status.state === 'error' && (
                    <span style={{ color: '#dc3232' }}>{status.error || 'Failed'}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Last Run ── */}
      {(results || lastRefresh) && (
        <>
          <div className="settings-group-header">Last Run</div>

          <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon copper">📥</div>
              </div>
              <div className="admin-stat-number">{totalFetched || '—'}</div>
              <div className="admin-stat-label">Fetched</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon sage">✨</div>
              </div>
              <div className="admin-stat-number">{totalNew || '—'}</div>
              <div className="admin-stat-label">New</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon white">⏭</div>
              </div>
              <div className="admin-stat-number">{totalRejected || '—'}</div>
              <div className="admin-stat-label">Rejected</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon white">🔁</div>
              </div>
              <div className="admin-stat-number">{totalFetched - totalNew - totalRejected || '—'}</div>
              <div className="admin-stat-label">Dupes Skipped</div>
            </div>
          </div>

          {results?.events?.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="admin-toolbar" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
                  Imported Events ({results.events.length})
                </span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Image</th>
                      <th>Name</th>
                      <th>Venue</th>
                      <th>Price</th>
                      <th>City</th>
                      <th>Date</th>
                      <th>Pillar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.events.map(ev => (
                      <tr key={ev._id}>
                        <td>
                          {ev.imageUrl ? (
                            <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer">
                              <img src={ev.imageUrl} alt="" className="admin-thumb" />
                            </a>
                          ) : (
                            <div className="admin-thumb" style={{ background: 'rgba(255,255,255,0.04)' }} />
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{ev.name}</td>
                        <td style={{ color: 'var(--admin-text-muted)', fontSize: 12, maxWidth: 160 }}>{ev.venue || '—'}</td>
                        <td style={{ fontSize: 12 }}>{ev.price || '—'}</td>
                        <td>{ev.city}</td>
                        <td>{formatDate(ev.date)}</td>
                        <td>
                          <span className="admin-status-badge admin-status-approved">{ev.pillar || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results?.events?.length === 0 && (
            <div className="admin-stat-card" style={{ textAlign: 'center', padding: 24, marginBottom: 32 }}>
              <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>
                No new events — all already in the database.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Activity ── */}
      <div className="settings-group-header">Activity</div>

      <div style={{ marginBottom: 24, border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: 'var(--admin-card)',
          borderBottom: '1px solid var(--admin-border)',
        }}>
          {!devMode && (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>Status Feed</span>
              {lastRefresh && (
                <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginLeft: 4 }}>
                  · {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: health.color,
                    boxShadow: health.status === 'running' ? '0 0 6px rgba(240,180,41,0.5)' : 'none',
                    animation: health.status === 'running' ? 'scraper-pulse-dot 1.2s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ fontSize: 11, color: health.color }}>
                    {health.label}
                  </span>
                </div>
              </div>
            </>
          )}
          {devMode && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text)' }}>Dev Logs</span>
              {logs.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginLeft: 4 }}>
                  ({logs.length} entries)
                </span>
              )}
            </>
          )}
        </div>

        {devMode ? (
          <div style={{
            maxHeight: 200, overflowY: 'auto', padding: '8px 16px',
            background: '#0a0a0a', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace", fontSize: 11, lineHeight: 1.6,
          }}>
            {logs.length === 0 ? (
              <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No logs yet.</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, opacity: log.type === 'start' ? 0.7 : 1 }}>
                  <span style={{ color: '#666', flexShrink: 0 }}>[{log.time}]</span>
                  <span style={{ color: SOURCE_COLORS[log.source] || '#888', fontWeight: 600, flexShrink: 0, minWidth: 90 }}>
                    {SOURCE_LABELS[log.source] || log.source}
                  </span>
                  <span style={{
                    color: log.type === 'error' ? '#dc3232' : log.type === 'success' ? '#8A9A5B' : '#e5e5e5',
                  }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="sf-feed" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div className="sf-empty">No activity yet. Run a scraper to see results.</div>
            ) : (
              [...logs].reverse().map((log, i) => {
                const idx = logs.length - 1 - i
                const isError = log.type === 'error'
                const isExpanded = expandedErrors.has(idx)
                return (
                  <div key={idx} className="sf-item">
                    <StatusIcon type={log.type} />
                    <div className="sf-content">
                      <div className="sf-row">
                        <span className={isError ? 'sf-message sf-message-error' : 'sf-message'}>
                          {humanSummary(log)}
                        </span>
                        <span className="sf-time">{log.time}</span>
                      </div>
                      {isError && (
                        <div className="sf-error-details">
                          <button
                            className="sf-details-toggle"
                            onClick={() => toggleError(idx)}
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                          {isExpanded && (
                            <div className="sf-error-raw">
                              {log.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className="sf-footer">
          <label className="sf-dev-toggle">
            <input
              type="checkbox"
              checked={devMode}
              onChange={() => setDevMode(!devMode)}
            />
            Developer Mode
          </label>
          {logs.length > 0 && (
            <button
              className="sf-clear-btn"
              onClick={() => { setLogs([]); setExpandedErrors(new Set()) }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Recent Imports */}
      <div style={{ marginBottom: 32 }}>
        <div className="admin-section-header">
          <h3 className="admin-section-title">Recent Imports</h3>
          <button className="admin-btn-sm admin-btn-edit" onClick={loadHistory}>
            {showHistory ? 'Refresh' : 'View History'}
          </button>
          {showHistory && (
            <button className="admin-btn-sm admin-btn-edit" onClick={() => setShowHistory(false)}>
              Hide
            </button>
          )}
        </div>
        {showHistory && history && (
          history.length === 0 ? (
            <p className="admin-empty">No scraped events yet.</p>
          ) : (
            <div className="admin-activity-feed">
              {history.map(ev => (
                <div key={ev._id} className="admin-activity-item">
                  <div className="admin-activity-dot sage" />
                  <span style={{ fontWeight: 500 }}>{ev.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    {SOURCE_LABELS[ev.source] || ev.source}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{ev.city}</span>
                  <span>{formatDate(ev.date)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Venue Scraper ── */}
      <div className="settings-group-header">Venue Scraper</div>

      <AdminVenueScraper />
    </div>
  )
}
