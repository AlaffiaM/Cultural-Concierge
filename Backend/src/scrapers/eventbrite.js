// Eventbrite connector — uses the official Eventbrite v3 API (no page scraping).
// Requires EVENTBRITE_API_TOKEN (a personal OAuth token from Eventbrite's portal).
// If the token is missing the source is skipped gracefully.
const axios = require('axios')
const { classifyType } = require('../utils/eventClassifier')

const SOURCE = 'eventbrite'
const API_BASE = 'https://www.eventbriteapi.com/v3'

const CATEGORIES = ['103', '110', '104', '105', '113', '108', '115', '199'] // music, food, performing, visual, home&lifestyle, sports, family, other

const CITY_QUERIES = {
  Lagos: { address: 'Lagos, Nigeria', within: '50km' },
  Abuja: { address: 'Abuja, Nigeria', within: '50km' },
  Nairobi: { address: 'Nairobi, Kenya', within: '50km' },
  Kigali: { address: 'Kigali, Rwanda', within: '50km' },
}

const MAX_PAGES = 10
const DELAY_MS = 800

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

function minPrice(ticketClasses) {
  const costs = (ticketClasses || [])
    .filter(t => t.cost)
    .map(t => parseFloat(t.cost.value))
    .filter(n => !isNaN(n) && n >= 0)
  if (!costs.length) return ''
  const min = Math.min(...costs)
  return min === 0 ? 'Free' : String(min)
}

function extractTime(dateObj) {
  if (!dateObj) return ''
  try {
    const d = new Date(dateObj.utc || dateObj.local)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (_) {
    return ''
  }
}

async function searchCity(city) {
  const events = []
  const seen = new Set()
  const { address, within } = CITY_QUERIES[city]
  let continuation = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = {
      'location.address': address,
      'location.within': within,
      categories: CATEGORIES.join(','),
      expand: 'venue,ticket_classes',
      'start_date.range_start': new Date(Date.now() - 6 * 86400000).toISOString(),
    }
    if (continuation) params.continuation = continuation

    const { data } = await axios.get(`${API_BASE}/events/search/`, {
      timeout: 20000,
      headers: { Authorization: `Bearer ${process.env.EVENTBRITE_API_TOKEN}` },
      params,
    })

    for (const ev of (data.events || [])) {
      if (!ev || !ev.name?.text) continue
      if (seen.has(ev.id)) continue
      seen.add(ev.id)

      const venue = ev.venue || {}
      const date = new Date(ev.start?.utc || ev.start?.local)
      if (isNaN(date.getTime())) continue

      // Prefer the venue's address city; fall back to the searched city.
      const venueCity = (venue.address?.city || '').trim()
      const eventCity = venueCity && city.trim().toLowerCase().startsWith(venueCity.toLowerCase().slice(0, 2)) ? venueCity : city

      events.push({
        name: ev.name.text,
        city: eventCity,
        date,
        description: ev.description?.text || '',
        imageUrl: ev.logo?.url || '',
        pillar: classifyPillar(ev.name.text, ev.description?.text || ''),
        type: classifyType(ev.name.text, ev.description?.text || ''),
        venue: venue.name || '',
        price: minPrice(ev.ticket_classes),
        source: SOURCE,
        url: ev.url || '',
        time: extractTime(ev.start),
        coordinates: venue.address?.latitude && venue.address?.longitude
          ? { lat: parseFloat(venue.address.latitude), lng: parseFloat(venue.address.longitude) }
          : null,
      })
    }

    continuation = data.pagination?.continuation
    if (!continuation) break
    if (page < MAX_PAGES - 1) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  return events
}

async function scrape() {
  if (!process.env.EVENTBRITE_API_TOKEN) {
    console.warn('[eventbrite] EVENTBRITE_API_TOKEN not configured — skipping source')
    return { events: [], error: null, skipped: true }
  }

  const events = []
  const errors = []

  for (const city of Object.keys(CITY_QUERIES)) {
    try {
      const cityEvents = await searchCity(city)
      events.push(...cityEvents)
      console.log(`[eventbrite] ${city}: ${cityEvents.length} events`)
    } catch (err) {
      const status = err.response?.status || err.message
      console.error(`[eventbrite] ${city} failed:`, status)
      errors.push(`${city}: ${status}`)
    }
  }

  return { events, error: errors.length ? errors.join('; ') : null }
}

module.exports = { scrape }

if (require.main === module) {
  scrape().then(({ events, error }) => {
    if (error) console.error(`[eventbrite] Error: ${error}`)
    console.log(`Got ${events.length} events from Eventbrite`)
    events.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(6)} | ${e.name.slice(0, 60)}`))
  }).catch(e => console.error(e))
}