import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

const CATEGORIES = [
  { name: 'Wellness', tags: ['Mindfulness', 'Yoga', 'Sound Healing', 'Meditation', 'Spa', 'Holistic', 'Self-Care', 'Reset', 'Wellness Journey'] },
  { name: 'Art & Creativity', tags: ['Sip and Paint', 'Gallery Opening', 'Exhibition', 'Fine Art', 'Curated', 'Artisan', 'Vernissage', 'Creative Hub'] },
  { name: 'Dining', tags: ['Gastronomy', 'Tasting Menu', "Chef's Table", 'Farm-to-Table', 'Brunch', 'Fine Dining', 'Culinary Art', 'Foodie'] },
  { name: 'Music (Intimate)', tags: ['Jazz Session', 'Acoustic', 'Unplugged', 'Vinyl Night', 'Soul', 'Lounge', 'Sundowner', 'Speakeasy', 'Afro-Jazz'] },
  { name: 'Cultural & Arts', tags: ['Theatre', 'Play', 'Performance', 'Heritage', 'Festival', 'Folklore', 'Stage Play', 'Roots'] },
  { name: 'Niche/Outdoors', tags: ['Birdwatching', 'Pottery', 'Day Retreat', 'Workshop', 'Nature Walk', 'Eco-Tourism', 'Hidden Gems', 'Craft Class'] },
]

const REGIONAL = [
  { region: 'Lagos', tags: ['#SoftLife', '#Detty', '#Gbedu', '#Owambe', '#Outside', '#PremiumDining', '#EkoGlam', '#Vawulence'] },
  { region: 'Nairobi', tags: ['#ThePlot', '#Sundowner', '#Sherehe', '#Form', '#NyamaChoma', '#VibeYa254', '#Kutano'] },
  { region: 'Kigali', tags: ['#Cuvée', '#Inshuti', '#Scenic', '#MadeInRwanda', '#KigaliLife', '#Degustation'] },
  { region: 'Global', tags: ['#Birdwatching', '#Pottery', '#SipAndPaint', '#IntimateMusic', '#PopUp', '#SecretLocation'] },
]

export default function AdminTags() {
  const [dbTags, setDbTags] = useState([])

  useEffect(() => {
    adminFetch('/api/admin/tags').then(setDbTags).catch(() => {})
  }, [])

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginBottom: 24 }}>
        Tag taxonomy for the Alaffia keyword system. Structured CRUD coming in Phase 2.
      </p>

      {CATEGORIES.map(cat => (
        <div key={cat.name} style={{ marginBottom: 24 }}>
          <h4 style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 10,
            color: 'var(--admin-copper)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {cat.name}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cat.tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '5px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--admin-text)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}

      <h4 style={{
        fontSize: 13,
        fontWeight: 700,
        margin: '28px 0 14px',
        color: 'var(--admin-copper)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Regional Slang
      </h4>

      {REGIONAL.map(reg => (
        <div key={reg.region} style={{ marginBottom: 24 }}>
          <h5 style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
            color: 'var(--admin-text-muted)',
          }}>
            {reg.region}
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {reg.tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '5px 14px',
                  background: 'rgba(180,95,45,0.08)',
                  border: '1px solid rgba(180,95,45,0.15)',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#B45F2D',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}

      {dbTags.length > 0 && (
        <>
          <h4 style={{
            fontSize: 13,
            fontWeight: 700,
            margin: '28px 0 14px',
            color: 'var(--admin-copper)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Tags Found in Database
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {dbTags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '5px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--admin-text-muted)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
