import { useState } from 'react'
import { API_BASE } from './lib/api'
import './EventSubmissionForm.css'

const CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = [
  { value: 'CULTURE', label: 'Arts & culture' },
  { value: 'WELLNESS', label: 'Wellness' },
  { value: 'SOCIAL', label: 'Food, music & social' },
]
const TYPES = ['Festival', 'Exhibition', 'Film', 'Workshop', 'Performance', 'Dining', 'Wellness', 'Music', 'Art', 'Pop-up', 'Brunch', 'Other']

const initialForm = (city) => ({
  eventName: '',
  city: CITIES.includes(city) ? city : 'Lagos',
  date: '',
  time: '',
  type: '',
  pillar: 'CULTURE',
  venue: '',
  address: '',
  description: '',
  price: '',
  imageUrl: '',
  url: '',
  submitterName: '',
  submitterEmail: '',
  consent: false,
})

export default function EventSubmissionForm({ city, onBack }) {
  const [form, setForm] = useState(() => initialForm(city))
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requestError, setRequestError] = useState('')

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImageError('')
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Choose an image smaller than 5 MB.')
      return
    }

    setUploadingImage(true)
    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch(`${API_BASE}/api/event-submissions/image`, { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Image upload failed.')
      update('imageUrl', data.url)
    } catch (error) {
      console.error('[EventSubmissionForm] Image upload failed:', error.message)
      setImageError(error.message || 'Image upload failed. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setRequestError('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE}/api/event-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrors(data.errors || [])
        setRequestError(data.errors ? '' : data.message || 'Could not submit the event.')
        return
      }
      setSuccess(true)
    } catch (error) {
      console.error('[EventSubmissionForm] Submit failed:', error.message)
      setRequestError('We could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <section className="submission-page">
        <div className="submission-success">
          <span className="submission-success-mark" aria-hidden="true">✓</span>
          <p className="submission-eyebrow">Thank you for sharing</p>
          <h1>Your event is in review</h1>
          <p>Our team will check the details before publishing. Community-submitted events are reviewed to keep the listings useful and trustworthy.</p>
          <button className="submission-secondary-btn" onClick={onBack}>Back to exploring</button>
        </div>
      </section>
    )
  }

  return (
    <section className="submission-page">
      <div className="submission-heading">
        <button type="button" className="submission-back" onClick={onBack}>← Back to exploring</button>
        <p className="submission-eyebrow">Community events</p>
        <h1>Share something worth experiencing</h1>
        <p>Know about a great cultural, wellness, or social event? Send it to us. We’ll review it before it appears in the guide.</p>
      </div>

      <form className="submission-form" onSubmit={handleSubmit}>
        <div className="submission-section-heading">
          <span>01</span><div><h2>Event details</h2><p>Tell us what, where, and when.</p></div>
        </div>
        <div className="submission-fields">
          <label className="submission-field submission-field-wide">
            <span>Event name <b>*</b></span>
            <input required maxLength={120} value={form.eventName} onChange={e => update('eventName', e.target.value)} placeholder="e.g. Lagos Film Night" />
          </label>
          <label className="submission-field">
            <span>City <b>*</b></span>
            <select required value={form.city} onChange={e => update('city', e.target.value)}>
              {CITIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="submission-field">
            <span>Category <b>*</b></span>
            <select required value={form.pillar} onChange={e => update('pillar', e.target.value)}>
              {PILLARS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="submission-field">
            <span>Date <b>*</b></span>
            <input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={e => update('date', e.target.value)} />
          </label>
          <label className="submission-field">
            <span>Time</span>
            <input maxLength={80} value={form.time} onChange={e => update('time', e.target.value)} placeholder="e.g. 6:00 PM" />
          </label>
          <label className="submission-field">
            <span>Event type</span>
            <select value={form.type} onChange={e => update('type', e.target.value)}>
              <option value="">Choose a type</option>
              {TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="submission-field">
            <span>Venue</span>
            <input maxLength={160} value={form.venue} onChange={e => update('venue', e.target.value)} placeholder="Venue or host space" />
          </label>
          <label className="submission-field submission-field-wide">
            <span>Address or area</span>
            <input maxLength={240} value={form.address} onChange={e => update('address', e.target.value)} placeholder="Neighborhood, street, or venue address" />
          </label>
          <label className="submission-field">
            <span>Price</span>
            <input maxLength={80} value={form.price} onChange={e => update('price', e.target.value)} placeholder="Free, or ticket price" />
          </label>
          <label className="submission-field submission-field-wide">
            <span>What should people know? <b>*</b></span>
            <textarea required minLength={10} maxLength={3000} rows={5} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Share a clear description, who it’s for, and what makes it special." />
          </label>
          <label className="submission-field submission-field-wide">
            <span>Booking or event link</span>
            <input type="url" value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://..." />
          </label>
          <label className="submission-field submission-field-wide">
            <span>Event poster or image</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleImageUpload} disabled={uploadingImage} />
            <small>{uploadingImage ? 'Uploading image…' : 'Optional · JPG, PNG, WebP, or AVIF · up to 5 MB'}</small>
            <input type="url" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} placeholder="Link to a poster or event image (optional)" />
            {imageError && <span className="submission-image-error" role="alert">{imageError}</span>}
            {form.imageUrl && <img className="submission-image-preview" src={form.imageUrl} alt="Event poster preview" />}
          </label>
        </div>

        <div className="submission-section-heading submission-contact-heading">
          <span>02</span><div><h2>Your details</h2><p>We may contact you if we need to verify something.</p></div>
        </div>
        <div className="submission-fields">
          <label className="submission-field">
            <span>Your name <b>*</b></span>
            <input required maxLength={120} autoComplete="name" value={form.submitterName} onChange={e => update('submitterName', e.target.value)} />
          </label>
          <label className="submission-field">
            <span>Contact email <b>*</b></span>
            <input required type="email" maxLength={254} autoComplete="email" value={form.submitterEmail} onChange={e => update('submitterEmail', e.target.value)} />
          </label>
        </div>

        <label className="submission-consent">
          <input type="checkbox" required checked={form.consent} onChange={e => update('consent', e.target.checked)} />
          <span>I confirm these details are accurate and understand this event will be reviewed before publishing.</span>
        </label>

        {errors.length > 0 && (
          <div className="submission-error" role="alert">
            <strong>Please check these details:</strong>
            <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        {requestError && <p className="submission-error" role="alert">{requestError}</p>}

        <div className="submission-submit-row">
          <p>Your contact details stay with our review team and are not shown on public event listings.</p>
          <button type="submit" className="submission-submit-btn" disabled={submitting || uploadingImage}>
            {uploadingImage ? 'Uploading image…' : submitting ? 'Sending for review…' : 'Send event for review'}
          </button>
        </div>
      </form>
    </section>
  )
}
