import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './adminApi'
import ImageUploader from './ImageUploader'
import './VenueEditor.css'

const CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['CULTURE', 'WELLNESS', 'SOCIAL']
const ALL_VIBES = ['Premium', 'Chic', 'Serene', 'Intimate', 'Vibrant', 'Curated']

const emptyForm = {
  name: '',
  city: 'Lagos',
  type: '',
  pillar: 'CULTURE',
  vibeTags: [],
  tags: '',
  description: '',
  tip: '',
  address: '',
  imagesText: '',
  coordinates: { lat: '', lng: '' },
  status: 'active',
}

export default function VenueEditor({ venue, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const isEditing = !!venue

  useEffect(() => {
    if (venue) {
      setForm({
        name: venue.name || '',
        city: venue.city || 'Lagos',
        type: venue.type || '',
        pillar: venue.pillar || 'CULTURE',
        vibeTags: venue.vibeTags || [],
        tags: (venue.tags || []).join(', '),
        description: venue.description || '',
        tip: venue.tip || '',
        address: venue.address || '',
        imagesText: (venue.images || []).join('\n'),
        coordinates: {
          lat: venue.coordinates?.lat ?? '',
          lng: venue.coordinates?.lng ?? '',
        },
        status: venue.status || 'active',
      })
    }
  }, [venue])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCoordChange(field, value) {
    setForm(prev => ({ ...prev, coordinates: { ...prev.coordinates, [field]: value } }))
  }

  const handleImageUploaded = useCallback((url) => {
    setForm(prev => ({
      ...prev,
      imagesText: prev.imagesText ? prev.imagesText + '\n' + url : url,
    }))
  }, [])

  function toggleVibe(vibe) {
    setForm(prev => ({
      ...prev,
      vibeTags: prev.vibeTags.includes(vibe)
        ? prev.vibeTags.filter(v => v !== vibe)
        : [...prev.vibeTags, vibe],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const images = form.imagesText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)

      const tags = form.tags
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const body = {
        name: form.name,
        city: form.city,
        type: form.type,
        pillar: form.pillar,
        vibeTags: form.vibeTags,
        tags,
        description: form.description,
        tip: form.tip,
        address: form.address,
        images,
        coordinates: {
          lat: parseFloat(form.coordinates.lat) || undefined,
          lng: parseFloat(form.coordinates.lng) || undefined,
        },
        status: form.status,
      }
      if (isEditing) {
        await adminFetch(`/api/venues/${venue._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await adminFetch('/api/venues', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }
      onClose()
    } catch (err) {
      console.error('[VenueEditor] Save failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  const previewUrls = form.imagesText.split('\n').map(s => s.trim()).filter(s => s.startsWith('http'))

  return (
    <div className="editor-wrap">
      <div className="editor-header">
        <h2 className="editor-title">{isEditing ? 'Edit Venue' : 'Create Venue'}</h2>
        <button className="admin-back-btn" onClick={onClose}>Cancel</button>
      </div>

      <div className="editor-grid">
        <div className="editor-field">
          <label>Name *</label>
          <input value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Venue name" />
        </div>

        <div className="editor-field">
          <label>City</label>
          <select value={form.city} onChange={e => handleChange('city', e.target.value)}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Type</label>
          <input value={form.type} onChange={e => handleChange('type', e.target.value)} placeholder="e.g. Art Gallery, Spa" />
        </div>

        <div className="editor-field">
          <label>Pillar</label>
          <select value={form.pillar} onChange={e => handleChange('pillar', e.target.value)}>
            {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="editor-field editor-field-wide">
          <label>Vibe Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_VIBES.map(vibe => (
              <button
                key={vibe}
                type="button"
                className={`vibe-chip ${form.vibeTags.includes(vibe) ? 'active' : ''}`}
                style={form.vibeTags.includes(vibe) ? {
                  '--vibe-color': '#B45F2D',
                  '--vibe-bg': 'rgba(180,95,45,0.12)',
                  borderColor: '#B45F2D',
                  color: '#B45F2D',
                  background: 'rgba(180,95,45,0.12)',
                } : {}}
                onClick={() => toggleVibe(vibe)}
              >
                {vibe}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field editor-field-wide">
          <label>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => handleChange('tags', e.target.value)} placeholder="e.g. outdoor, live-music, rooftop" />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Description</label>
          <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} placeholder="Description..." />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Pro Tip</label>
          <input value={form.tip} onChange={e => handleChange('tip', e.target.value)} placeholder="Pro tip..." />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Address</label>
          <input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Full street address..." />
        </div>

        <div className="editor-field editor-field-wide">
          <label>Images (one URL per line)</label>
          <textarea
            value={form.imagesText}
            onChange={e => handleChange('imagesText', e.target.value)}
            rows={4}
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
          />
          <ImageUploader onUploaded={handleImageUploaded} label="Upload New Image" />
          {previewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {previewUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt=""
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="editor-field">
          <label>Latitude</label>
          <input type="number" step="any" value={form.coordinates.lat} onChange={e => handleCoordChange('lat', e.target.value)} />
        </div>

        <div className="editor-field">
          <label>Longitude</label>
          <input type="number" step="any" value={form.coordinates.lng} onChange={e => handleCoordChange('lng', e.target.value)} />
        </div>

        <div className="editor-field">
          <label>Status</label>
          <select value={form.status} onChange={e => handleChange('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="scraped">Scraped</option>
          </select>
        </div>
      </div>

      <div className="editor-actions">
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? 'Saving...' : isEditing ? 'Update Venue' : 'Create Venue'}
        </button>
      </div>
    </div>
  )
}
