import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './adminApi'
import ImageUploader from './ImageUploader'
import './EventEditor.css'

const CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['CULTURE', 'WELLNESS', 'SOCIAL']
const VIBES = ['Premium', 'Chic', 'Serene', 'Intimate', 'Vibrant', 'Curated']
const TYPES = ['Festival', 'Exhibition', 'Workshop', 'Performance', 'Dining', 'Wellness', 'Music', 'Art', 'Pop-up', 'Brunch', 'Sundowner', 'Other']

const emptyForm = {
  name: '',
  city: 'Lagos',
  date: '',
  endDate: '',
  time: '',
  type: '',
  pillar: 'CULTURE',
  vibe: '',
  tags: '',
  description: '',
  tip: '',
  imageUrl: '',
  coordinates: { lat: '', lng: '' },
  linkedSpotId: '',
  isGhostLocation: false,
}

export default function EventEditor({ event, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [venues, setVenues] = useState([])
  const [saving, setSaving] = useState(false)

  const isEditing = !!event

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name || '',
        city: event.city || 'Lagos',
        date: event.date ? event.date.slice(0, 10) : '',
        endDate: event.endDate ? event.endDate.slice(0, 10) : '',
        time: event.time || '',
        type: event.type || '',
        pillar: event.pillar || 'CULTURE',
        vibe: event.vibe || '',
        tags: (event.tags || []).join(', '),
        description: event.description || '',
        tip: event.tip || '',
        imageUrl: event.imageUrl || '',
        coordinates: {
          lat: event.coordinates?.lat ?? '',
          lng: event.coordinates?.lng ?? '',
        },
        linkedSpotId: event.linkedSpotId?._id || event.linkedSpotId || '',
        isGhostLocation: event.isGhostLocation || false,
      })
    }
    adminFetch('/api/venues')
      .then(data => setVenues(Array.isArray(data) ? data : data.venues || []))
      .catch(() => {})
  }, [event])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCoordChange(field, value) {
    setForm(prev => ({
      ...prev,
      coordinates: { ...prev.coordinates, [field]: value },
    }))
  }

  const handleImageUploaded = useCallback((url) => {
    setForm(prev => ({ ...prev, imageUrl: url }))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        city: form.city,
        date: form.date,
        endDate: form.endDate || undefined,
        time: form.time,
        type: form.type,
        pillar: form.pillar,
        vibe: form.vibe,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        description: form.description,
        tip: form.tip,
        imageUrl: form.imageUrl,
        coordinates: {
          lat: parseFloat(form.coordinates.lat) || 0,
          lng: parseFloat(form.coordinates.lng) || 0,
        },
        linkedSpotId: form.isGhostLocation ? null : (form.linkedSpotId || null),
        isGhostLocation: form.isGhostLocation,
      }
      if (isEditing) {
        await adminFetch(`/api/events/${event._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await adminFetch('/api/events', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }
      onClose()
    } catch (err) {
      console.error('[EventEditor] Save failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor-wrap">
      <div className="editor-header">
        <h2 className="editor-title">{isEditing ? 'Edit Event' : 'Create Event'}</h2>
        <button className="admin-back-btn" onClick={onClose}>Cancel</button>
      </div>

      <div className="editor-grid">
        <div className="editor-field">
          <label>Event Name *</label>
          <input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. The Grape Escape" />
        </div>

        <div className="editor-field">
          <label>City</label>
          <select value={form.city} onChange={e => handleChange('city', e.target.value)}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Date *</label>
          <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} />
        </div>

        <div className="editor-field">
          <label>End Date</label>
          <input type="date" value={form.endDate} onChange={e => handleChange('endDate', e.target.value)} />
        </div>

        <div className="editor-field">
          <label>Time</label>
          <input value={form.time} onChange={e => handleChange('time', e.target.value)} placeholder="e.g. 4pm - 9pm" />
        </div>

        <div className="editor-field">
          <label>Type</label>
          <select value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option value="">Select type</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Pillar</label>
          <select value={form.pillar} onChange={e => handleChange('pillar', e.target.value)}>
            {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Vibe</label>
          <select value={form.vibe} onChange={e => handleChange('vibe', e.target.value)}>
            <option value="">Select vibe</option>
            {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="editor-field editor-field-wide">
          <label>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => handleChange('tags', e.target.value)} placeholder="#Wine, #SoftLife, #Premium" />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Description</label>
          <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} placeholder="Event description..." />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Tip</label>
          <input value={form.tip} onChange={e => handleChange('tip', e.target.value)} placeholder="Pro tip for attendees..." />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Image URL</label>
          <input value={form.imageUrl} onChange={e => handleChange('imageUrl', e.target.value)} placeholder="https://..." />
          <ImageUploader onUploaded={handleImageUploaded} label="Upload New Image" />
          {form.imageUrl && (
            <div style={{ marginTop: 8 }}>
              <img
                src={form.imageUrl}
                alt=""
                style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>
          )}
        </div>

        <div className="editor-field">
          <label>Latitude</label>
          <input type="number" step="any" value={form.coordinates.lat} onChange={e => handleCoordChange('lat', e.target.value)} placeholder="6.5244" />
        </div>

        <div className="editor-field">
          <label>Longitude</label>
          <input type="number" step="any" value={form.coordinates.lng} onChange={e => handleCoordChange('lng', e.target.value)} placeholder="3.3792" />
        </div>

        <div className="editor-field editor-field-wide editor-ghost">
          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={form.isGhostLocation}
              onChange={e => handleChange('isGhostLocation', e.target.checked)}
            />
            <span>Ghost Location (pop-up / standalone event, no venue profile)</span>
          </label>
        </div>

        {!form.isGhostLocation && (
          <div className="editor-field editor-field-wide">
            <label>Linked Venue</label>
            <select value={form.linkedSpotId} onChange={e => handleChange('linkedSpotId', e.target.value)}>
              <option value="">— None —</option>
              {venues.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.city})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="editor-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.date}>
          {saving ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </div>
  )
}
