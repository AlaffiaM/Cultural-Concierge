const Event = require('../models/Event')

const REJECTED_TERMS = [
  'conference', 'corporate', 'seminar', 'summit', 'business',
  'hackathon', 'webinar',
]

const CITY_COORDS = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kigali: { lat: -1.9441, lng: 30.0619 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
}

function fuzzyNormalize(name) {
  let n = name.toLowerCase()
  // Strip trailing date patterns: "31st July", "31 July", "July 31"
  n = n.replace(/\b\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '')
  n = n.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/g, '')
  // Strip year patterns
  n = n.replace(/\b20\d{2}(?:\/\d{2,4}|-\d{2,4})?\b/g, '')
  // Strip edition/volume labels
  n = n.replace(/\b(edition|volume|vol|series|episode)\s*\d*\b/gi, '')
  // Strip parenthetical qualifiers
  n = n.replace(/\([^)]*\)/g, '')
  return n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

async function deduplicate(events) {
  const unique = []
  const seen = new Set()

  for (const ev of events) {
    const fuzzy = fuzzyNormalize(ev.name)
    const nameKey = fuzzy.replace(/\s/g, '').slice(0, 40)
    const dateKey = ev.date?.toISOString?.()?.slice(0, 10) || ''
    const cityKey = (ev.city || '').toLowerCase().trim()
    const key = `${nameKey}|${dateKey}|${cityKey}`

    if (seen.has(key)) continue
    seen.add(key)

    const escaped = fuzzy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const existing = await Event.findOne({
      city: { $regex: `^${cityKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      date: ev.date,
      name: { $regex: `^${escaped}`, $options: 'i' },
    })
    if (!existing) unique.push(ev)
  }
  return unique
}

async function runScrapers(sources) {
  const results = {}
  const allNew = []

  for (const source of sources) {
    try {
      const scraper = require(`./${source}`)
      const scraped = await scraper.scrape()
      const unique = await deduplicate(scraped)

      results[source] = {
        fetched: scraped.length,
        new: 0,
        skipped: scraped.length - unique.length,
        rejected: 0,
      }

      for (const ev of unique) {
        const text = `${ev.name} ${ev.description || ''}`.toLowerCase()
        if (REJECTED_TERMS.some(t => text.includes(t))) {
          results[source].rejected++
          continue
        }

        const coords = ev.coordinates || CITY_COORDS[ev.city] || CITY_COORDS.Nairobi
        const normalizedDate = ev.date ? new Date(new Date(ev.date).toISOString().slice(0, 10)) : new Date()
        const fuzzyName = fuzzyNormalize(ev.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const event = await Event.findOneAndUpdate(
          { name: { $regex: `^${fuzzyName}`, $options: 'i' }, city: { $regex: `^${(ev.city || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, date: normalizedDate },
          {
            $setOnInsert: {
              name: ev.name,
              city: ev.city,
              date: normalizedDate,
              description: ev.description || '',
              imageUrl: ev.imageUrl || '',
              pillar: ev.pillar || 'CULTURE',
              type: ev.type || '',
              venue: ev.venue || '',
              price: ev.price || '',
              source: ev.source || source,
              status: 'draft',
              isGhostLocation: true,
              coordinates: coords,
              tags: [source],
              time: ev.time || '',
            },
          },
          { upsert: true, new: true, collation: { locale: 'en', strength: 2 } }
        )
        results[source].new++
        allNew.push(event)
      }
    } catch (err) {
      results[source] = { fetched: 0, new: 0, skipped: 0, error: err.message }
    }
  }

  return { results, events: allNew, total: allNew.length }
}

module.exports = { runScrapers }
