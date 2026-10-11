import { useEffect, useState } from 'react'
import { adminFetch } from './adminApi'
import { useToast } from './Toast'
import './AdminEventSubmissions.css'

const TYPES = ['Festival', 'Exhibition', 'Film', 'Workshop', 'Performance', 'Dining', 'Wellness', 'Music', 'Art', 'Pop-up', 'Brunch', 'Other']
const PILLARS = ['CULTURE', 'WELLNESS', 'SOCIAL']

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export default function AdminEventSubmissions() {
  const { addToast } = useToast()
  const [submissions, setSubmissions] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reasons, setReasons] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    let active = true
    adminFetch(`/api/event-submissions?status=${statusFilter}`)
      .then(data => {
        if (!active) return
        setLoadError('')
        setSubmissions(Array.isArray(data) ? data : [])
      })
      .catch(error => {
        if (!active) return
        console.error('[AdminEventSubmissions] Load failed:', error.message)
        setLoadError(error.message || 'Could not load community submissions.')
        addToast('Could not load community submissions', 'error')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [addToast, statusFilter])

  async function reloadSubmissions() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await adminFetch(`/api/event-submissions?status=${statusFilter}`)
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('[AdminEventSubmissions] Load failed:', error.message)
      setLoadError(error.message || 'Could not load community submissions.')
      addToast('Could not load community submissions', 'error')
    } finally {
      setLoading(false)
    }
  }

  function updateSubmission(id, field, value) {
    setSubmissions((current) => current.map((item) => (
      item._id === id ? { ...item, [field]: value } : item
    )))
  }

  async function approve(submission) {
    setBusyId(submission._id)
    try {
      const payload = {
        eventName: submission.eventName,
        city: submission.city,
        date: toDateInput(submission.date),
        time: submission.time || '',
        type: submission.type || '',
        pillar: submission.pillar || 'CULTURE',
        venue: submission.venue || '',
        address: submission.address || '',
        description: submission.description || '',
        price: submission.price || '',
        imageUrl: submission.imageUrl || '',
        url: submission.url || '',
      }
      await adminFetch(`/api/event-submissions/${submission._id}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSubmissions((current) => current.filter((item) => item._id !== submission._id))
      addToast('Event approved and published', 'success')
    } catch (error) {
      console.error('[AdminEventSubmissions] Approve failed:', error.message)
      addToast(error.message || 'Could not approve this event', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function reject(submission) {
    const reason = (reasons[submission._id] || '').trim()
    if (!reason) {
      addToast('Add a review reason before rejecting', 'error')
      return
    }
    setBusyId(submission._id)
    try {
      await adminFetch(`/api/event-submissions/${submission._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      setSubmissions((current) => current.filter((item) => item._id !== submission._id))
      addToast('Submission rejected and review reason saved', 'success')
    } catch (error) {
      console.error('[AdminEventSubmissions] Reject failed:', error.message)
      addToast(error.message || 'Could not reject this submission', 'error')
    } finally {
      setBusyId('')
    }
  }

  if (loading) return <p className="admin-empty">Loading community submissions…</p>
  if (loadError) {
    return (
      <div className="community-review-empty" role="alert">
        <h3>Submissions couldn’t be loaded</h3>
        <p>{loadError}</p>
        <button className="community-approve-btn" onClick={reloadSubmissions}>Try again</button>
      </div>
    )
  }

  return (
    <div className="community-review">
      <div className="community-review-intro">
        <div>
          <span className="community-review-eyebrow">Community submissions</span>
          <h3>Review events from the community</h3>
          <p>Check the details, make edits if needed, then publish or record why a submission was declined.</p>
        </div>
        <span className="community-review-count">{submissions.length} {statusFilter === 'pending' ? 'to review' : statusFilter}</span>
      </div>

      <div className="community-review-filters" role="group" aria-label="Filter submission history">
        {[
          { value: 'pending', label: 'Needs review' },
          { value: 'approved', label: 'Published' },
          { value: 'rejected', label: 'Declined' },
        ].map(option => (
          <button
            key={option.value}
            className={statusFilter === option.value ? 'active' : ''}
            onClick={() => { setStatusFilter(option.value); setLoading(true); setLoadError('') }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {submissions.length === 0 ? (
        <div className="community-review-empty">
          <span aria-hidden="true">✦</span>
          <h3>{statusFilter === 'pending' ? 'You’re all caught up' : 'No review history yet'}</h3>
          <p>{statusFilter === 'pending' ? 'New community-submitted events will appear here for review.' : 'Reviewed submissions will appear here for future reference.'}</p>
        </div>
      ) : (
        <div className="community-submission-list">
          {submissions.map((submission) => statusFilter !== 'pending' ? (
            <article className="community-history-card" key={submission._id}>
              <div className="community-history-title">
                <div>
                  <span className={`community-history-status ${submission.status}`}>{submission.status === 'approved' ? 'Published' : 'Declined'}</span>
                  <h3>{submission.eventName}</h3>
                  <p>{submission.city} · {new Date(submission.date).toLocaleDateString()}</p>
                </div>
                <span className="community-history-date">Reviewed {submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleDateString() : '—'}</span>
              </div>
              {submission.status === 'rejected' ? (
                <p className="community-history-feedback"><strong>Review reason:</strong> {submission.rejectionReason || 'No reason recorded'}</p>
              ) : (
                <details className="community-history-details">
                  <summary>Submission and published event record</summary>
                  <div className="community-history-columns">
                    <div><strong>Submitted</strong><p>{submission.eventName} · {submission.city} · {new Date(submission.date).toLocaleDateString()}</p></div>
                    <div><strong>Published</strong><p>{submission.reviewedEvent?.eventName || submission.eventName} · {submission.reviewedEvent?.city || submission.city} · {submission.reviewedEvent?.date ? new Date(submission.reviewedEvent.date).toLocaleDateString() : new Date(submission.date).toLocaleDateString()}</p></div>
                  </div>
                </details>
              )}
            </article>
          ) : (
            <article className="community-submission-card" key={submission._id}>
              <header className="community-submission-meta">
                <span>Submitted {new Date(submission.createdAt).toLocaleDateString()}</span>
                <span>By {submission.submitterName} · <a href={`mailto:${submission.submitterEmail}`}>{submission.submitterEmail}</a></span>
              </header>
              <div className="community-submission-fields">
                <label className="community-field community-field-wide">
                  <span>Event name</span>
                  <input value={submission.eventName} onChange={e => updateSubmission(submission._id, 'eventName', e.target.value)} />
                </label>
                <label className="community-field">
                  <span>City</span>
                  <select value={submission.city} onChange={e => updateSubmission(submission._id, 'city', e.target.value)}>
                    {['Lagos', 'Abuja', 'Kigali', 'Nairobi'].map(city => <option key={city}>{city}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Date</span>
                  <input type="date" value={toDateInput(submission.date)} onChange={e => updateSubmission(submission._id, 'date', e.target.value)} />
                </label>
                <label className="community-field">
                  <span>Category</span>
                  <select value={submission.pillar || 'CULTURE'} onChange={e => updateSubmission(submission._id, 'pillar', e.target.value)}>
                    {PILLARS.map(pillar => <option key={pillar}>{pillar}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Type</span>
                  <select value={submission.type || ''} onChange={e => updateSubmission(submission._id, 'type', e.target.value)}>
                    <option value="">Choose type</option>
                    {TYPES.map(type => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="community-field">
                  <span>Time</span>
                  <input value={submission.time || ''} onChange={e => updateSubmission(submission._id, 'time', e.target.value)} />
                </label>
                <label className="community-field">
                  <span>Venue</span>
                  <input value={submission.venue || ''} onChange={e => updateSubmission(submission._id, 'venue', e.target.value)} />
                </label>
                <label className="community-field community-field-wide">
                  <span>Address or area</span>
                  <input value={submission.address || ''} onChange={e => updateSubmission(submission._id, 'address', e.target.value)} />
                </label>
                <label className="community-field">
                  <span>Price</span>
                  <input value={submission.price || ''} onChange={e => updateSubmission(submission._id, 'price', e.target.value)} />
                </label>
                <label className="community-field">
                  <span>Booking or event link</span>
                  <input type="url" value={submission.url || ''} onChange={e => updateSubmission(submission._id, 'url', e.target.value)} />
                </label>
                <label className="community-field community-field-wide">
                  <span>Description</span>
                  <textarea rows={4} value={submission.description || ''} onChange={e => updateSubmission(submission._id, 'description', e.target.value)} />
                </label>
                <label className="community-field community-field-wide">
                  <span>Image link</span>
                  <input type="url" value={submission.imageUrl || ''} onChange={e => updateSubmission(submission._id, 'imageUrl', e.target.value)} />
                </label>
              </div>
              <div className="community-reject-row">
                <label className="community-field">
                  <span>Reason if declining</span>
                  <input
                    value={reasons[submission._id] || ''}
                    maxLength={500}
                    onChange={e => setReasons(current => ({ ...current, [submission._id]: e.target.value }))}
                    placeholder="e.g. Outside our cities or not an event listing"
                  />
                </label>
                <div className="community-review-actions">
                  <button className="community-reject-btn" disabled={busyId === submission._id} onClick={() => reject(submission)}>Decline</button>
                  <button className="community-approve-btn" disabled={busyId === submission._id} onClick={() => approve(submission)}>
                    {busyId === submission._id ? 'Saving…' : 'Save edits & publish'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
