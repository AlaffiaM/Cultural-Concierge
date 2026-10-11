// Mookh connector — pulls events via the Mookh API.
// Requires MOOKH_API_TOKEN (and optionally MOOKH_API_BASE). Mookh's API
// (api.mookh.com) is access-gated; without credentials this source is
// skipped gracefully instead of scraping their public pages.
const axios = require('axios')
const { classifyType } = require('../utils/eventClassifier')

const SOURCE = 'mookh'

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

function extractCity(text) {
  if (!text) return 'Nairobi'
  const t = text.toLowerCase()
  if (/\blagos\b/.test(t)) return 'Lagos'
  if (/\babuja\b/.test(t)) return 'Abuja'
  if (/\bkigali\b/.test(t)) return 'Kigali'
  if (/\bnairobi\b/.test(t)) return 'Nairobi'
  return 'Nairobi'
}

function extractTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (_) {
    return ''
  }
}

function minPrice(tickets) {
  const prices = (tickets || [])
    .map(t => parseFloat(t?.price ?? t?.amount))
    .filter(n => !isNaN(n) && n >= 0)
  if (!prices.length) return ''
  const min = Math.min(...prices)
  return min === 0 ? 'Free' : String(min)
}

function normalizeItem(item) {
  const name = item.title || item.name || item.event_name || ''
  if (!name) return null
  const date = new Date(item.start_date || item.startDate || item.start || item.date)
  if (isNaN(date.getTime())) return null
  return {
    name,
    city: extractCity(`${item.city || ''} ${item.venue || ''} ${item.location || ''}`),
    date,
    description: item.description || item.details || '',
    imageUrl: item.image || item.imageUrl || item.poster || '',
    pillar: classifyPillar(name, `${item.description || ''} ${item.category_name || ''}`),
    type: classifyType(name, `${item.description || ''} ${item.category_name || ''}`),
    venue: item.venue || item.location_name || '',
    price: minPrice(item.tickets) || item.price || '',
    source: SOURCE,
    url: item.url || item.eventUrl || '',
    time: extractTime(item.start_date || item.startDate || item.start),
    coordinates: item.latitude && item.longitude ? { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) } : null,
  }
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload
  if (payload?.data && Array.isArray(payload.data)) return payload.data
  if (payload?.events && Array.isArray(payload.events)) return payload.events
  if (payload?.data?.events && Array.isArray(payload.data.events)) return payload.data.events
  return payload?.items && Array.isArray(payload.items) ? payload.items : []
}

async function scrape() {
  const base = (process.env.MOOKH_API_BASE || 'https://api.mookh.com').replace(/\/$/, '')
  const token = process.env.MOOKH_API_TOKEN

  if (!token) {
    console.warn('[mookh] MOOKH_API_TOKEN not configured — skipping source')
    return { events: [], error: null, skipped: true }
  }

  const events = []
  const errors = []

  // Try the most common Mookh endpoints. The exact route/schema may need a
  // one-line adjustment once you have live API access (reach out to Mookh).
  for (const endpoint of ['/events', '/api/v1/events', '/api/events']) {
    try {
      const { data } = await axios.get(`${base}${endpoint}`, {
        timeout: 20000,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const items = extractItems(data)
      for (const item of items) {
        const ev = normalizeItem(item)
        if (ev) events.push(ev)
      }
      if (events.length) break
    } catch (err) {
      errors.push(`${endpoint}: ${err.response?.status || err.message}`)
    }
  }

  return { events, error: errors.length ? errors.join('; ') : null }
}

module.exports = { scrape }

if (require.main === module) {
  scrape().then(({ events, error }) => {
    if (error) console.error(`[mookh] Info: ${error}`)
    console.log(`Got ${events.length} events from Mookh`)
    events.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(8)} | ${e.name.slice(0, 50)}`))
  }).catch(e => console.error(e))
}