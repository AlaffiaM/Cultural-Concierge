import { useState } from 'react'
import { adminFetch } from './adminApi'
import { useToast } from './Toast'
import './EventEditor.css'

const COMING_SOON = [
  { icon: '🏛️', label: 'Generate Venue', sub: 'Create a venue profile from a name or address' },
  { icon: '🧭', label: 'Generate Advisory', sub: 'Draft a city travel advisory from scratch' },
  { icon: '✍️', label: 'Rewrite Description', sub: 'Improve event or venue copy with Gemini' },
]

export default function AdminAITools() {
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [pillar, setPillar] = useState('')
  const [tags, setTags] = useState(null)
  const [running, setRunning] = useState(false)
  const { addToast } = useToast()

  async function handleSuggest() {
    if (!description.trim()) {
      addToast('Enter a description first', 'error')
      return
    }
    setRunning(true)
    setTags(null)
    try {
      const res = await adminFetch('/api/ai/suggest-tags', {
        method: 'POST',
        body: JSON.stringify({ name, description, type, pillar }),
      })
      setTags(res.tags || [])
      if (!res.tags?.length) addToast('No tags suggested — try a longer description', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="settings-group-header">Suggest Tags</div>

      <div className="settings-section">
        <p className="settings-note">
          Paste an event or venue description and Gemini will suggest tags for it.
        </p>
        <div className="editor-grid">
          <div className="editor-field">
            <label>Name (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Grape Escape" />
          </div>
          <div className="editor-field">
            <label>Type (optional)</label>
            <input value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Festival" />
          </div>
          <div className="editor-field">
            <label>Pillar (optional)</label>
            <select value={pillar} onChange={e => setPillar(e.target.value)}>
              <option value="">Select pillar</option>
              <option value="CULTURE">CULTURE</option>
              <option value="WELLNESS">WELLNESS</option>
              <option value="SOCIAL">SOCIAL</option>
            </select>
          </div>
          <div className="editor-field editor-field-wide">
            <label>Description *</label>
            <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the event or venue in detail..." />
          </div>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={handleSuggest} disabled={running}>
          {running ? 'Thinking...' : 'Suggest Tags'}
        </button>

        {tags && (
          <div style={{ marginTop: 16 }}>
            <div className="admin-section-title" style={{ marginBottom: 8 }}>Suggested Tags</div>
            {tags.length === 0 ? (
              <p className="admin-empty">No tags returned.</p>
            ) : (
              <div className="admin-tags-wrap">
                {tags.map(tag => (
                  <span key={tag} className="admin-tag-chip">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="settings-group-header">More AI Tools</div>
      <div className="admin-quick-actions" style={{ marginBottom: 0 }}>
        {COMING_SOON.map(tool => (
          <div key={tool.label} className="admin-quick-action" style={{ opacity: 0.5, cursor: 'default' }}>
            <div className="admin-quick-action-icon white">{tool.icon}</div>
            <div className="admin-quick-action-body">
              <h4>{tool.label} <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-copper)' }}>Soon</span></h4>
              <p>{tool.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
