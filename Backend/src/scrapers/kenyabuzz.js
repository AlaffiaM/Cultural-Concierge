const axios = require('axios')

const SOURCE = 'kenyabuzz'
const API_BASE = 'https://api-v3.kenyabuzz.com/events/list'

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
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
  } catch (_) { return '' }
}

async function scrape() {
  const seen = new Set()
  const events = []

  // Fetch featured events (full details)
  try {
    const { data } = await axios.get(`${API_BASE}/featured-events`, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    })

    for (const ev of (data.data || [])) {
      const date = parseDate(ev.start_date)
      if (!date) continue

      const key = `${ev.name}|${date.toISOString().slice(0, 10)}`
      if (seen.has(key)) continue
      seen.add(key)

      events.push({
        name: ev.name,
        city: extractCity(`${ev.location_name || ''} ${ev.contact_address || ''}`),
        date,
        description: ev.plain_text_desc || ev.description || '',
        imageUrl: ev.poster || '',
        pillar: classifyPillar(ev.name, `${ev.description || ''} ${ev.category_name || ''}`),
        type: ev.category_name || '',
        venue: ev.location_name || '',
        price: ev.price || ev.ticket_price || ev.cost || '',
        source: SOURCE,
        time: extractTime(ev.start_date),
        coordinates: null,
      })
    }
  } catch (err) {
    console.error('[kenyabuzz] featured-events failed:', err.message)
  }

  // Fetch all events (paginated)
  for (let page = 1; page <= 5; page++) {
    try {
      const { data } = await axios.get(`${API_BASE}/all-events/${page}`, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' },
      })
      const items = data.data || []
      if (!items.length) break

      for (const ev of items) {
        const date = parseDate(ev.start_date)
        if (!date) continue

        const key = `${ev.event_name || ev.name}|${date.toISOString().slice(0, 10)}`
        if (seen.has(key)) continue
        seen.add(key)

        events.push({
          name: ev.event_name || ev.name,
          city: extractCity(ev.event_location || 'Nairobi'),
          date,
          description: ev.description || '',
          imageUrl: ev.event_poster || ev.poster || '',
          pillar: classifyPillar(ev.event_name || ev.name, ev.description || ''),
          type: '',
          venue: ev.event_location || '',
          price: ev.price || ev.ticket_price || ev.cost || '',
          source: SOURCE,
          time: extractTime(ev.start_date),
          coordinates: null,
        })
      }
    } catch (err) {
      console.error(`[kenyabuzz] all-events page ${page} failed:`, err.message)
      break
    }
  }

  return events
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`Got ${r.length} events from KenyaBuzz`)
    r.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(6)} | ${e.name.slice(0, 50)}`))
  }).catch(e => console.error(e))
}
