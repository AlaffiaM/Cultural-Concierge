import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const TAXONOMY = [
  { category: 'Pillars', tags: ['CULTURE', 'WELLNESS', 'SOCIAL'] },
  { category: 'Vibes', tags: ['Premium', 'Chic', 'Serene', 'Intimate', 'Vibrant', 'Curated'] },
  { category: 'Types', tags: ['Festival', 'Exhibition', 'Workshop', 'Performance', 'Dining', 'Wellness', 'Music', 'Art', 'Pop-up', 'Brunch', 'Sundowner'] },
]

export default function AdminTags() {
  const [dbTags, setDbTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/api/admin/tags')
      .then(data => setDbTags(Array.isArray(data) ? data : []))
      .catch(err => console.error('[AdminTags]', err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="settings-group-header">Tag Taxonomy</div>
      <div className="settings-section">
        <p className="settings-note">The standard vocabulary used across events and venues.</p>
        {TAXONOMY.map(group => (
          <div key={group.category} style={{ marginBottom: 16 }}>
            <div className="admin-section-title" style={{ marginBottom: 8 }}>{group.category}</div>
            <div className="admin-tags-wrap">
              {group.tags.map(tag => (
                <span key={tag} className="admin-tag-chip">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-group-header">Tags in Database</div>
      <div className="settings-section">
        {loading ? (
          <p className="admin-empty">Loading tags...</p>
        ) : dbTags.length === 0 ? (
          <p className="admin-empty">No tags found in the database yet.</p>
        ) : (
          <div className="admin-tags-wrap">
            {dbTags.map(tag => (
              <span key={tag} className="admin-tag-chip">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
