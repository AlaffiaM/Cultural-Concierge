const axios = require('axios')
const cheerio = require('cheerio')
const { classifyType } = require('../utils/eventClassifier')

const SOURCE = 'eventbrite'

const CATEGORIES = [
  'music',
  'food-and-drink',
  'performing-arts',
  'visual-arts',
  'hobbies',
  'health',
  'other',
]

const CITY_CATEGORY_URLS = {
  Lagos: CATEGORIES.map(c => `https://www.eventbrite.com/d/nigeria--lagos/events/${c}/`),
  Abuja: CATEGORIES.map(c => `https://www.eventbrite.com/d/nigeria--abuja/events/${c}/`),
  Nairobi: CATEGORIES.map(c => `https://www.eventbrite.com/d/kenya--nairobi/events/${c}/`),
  Kigali: CATEGORIES.map(c => `https://www.eventbrite.com/d/rwanda--kigali/events/${c}/`),
}

const DELAY_MS = 1500
const RATE_LIMIT_DELAY_MS = 10000

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

async function scrape() {
  let error = null
  const errors = []
  const events = []
  let consecutiveRateLimits = 0

  for (const [city, urls] of Object.entries(CITY_CATEGORY_URLS)) {
    for (const url of urls) {
      if (consecutiveRateLimits >= 3) {
        console.warn(`[eventbrite] ${city}: skipping remaining categories — too many consecutive 429s`)
        errors.push(`${city}: skipped (rate limited)`)
        break
      }

      try {
        const { data: html, status } = await axios.get(url, {
          timeout: 20000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          validateStatus: s => s < 500,
        })

        if (status === 429) {
          consecutiveRateLimits++
          console.warn(`[eventbrite] ${city} ${url.split('/').slice(-2, -1)[0]}: 429 rate limited (consecutive: ${consecutiveRateLimits}), backing off ${RATE_LIMIT_DELAY_MS}ms`)
          errors.push(`${city} ${url.split('/').slice(-2, -1)[0]}: 429 rate limited`)
          await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
          continue
        }

        consecutiveRateLimits = 0
        const $ = cheerio.load(html)
        const ldScript = $('script[type="application/ld+json"]').first()
        if (!ldScript.length) {
          console.error(`[eventbrite] ${city} ${url.split('/').slice(-2, -1)[0]}: no JSON-LD found`)
          continue
        }

        const data = JSON.parse(ldScript.html().trim())

        for (const entry of (data.itemListElement || [])) {
          const item = entry.item
          if (!item || !item.name) continue

          const date = new Date(item.startDate)
          if (isNaN(date.getTime())) continue

          const location = item.location?.name || ''
          const addressCity = item.location?.address?.addressLocality || city
          const geo = item.location?.geo || {}

          let time = ''
          if (item.startDate) {
            try {
              time = new Date(item.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            } catch (_) {}
          }

          const price = item.offers?.price?.toString() || ''

          events.push({
            name: item.name,
            city: addressCity,
            date,
            description: item.description || '',
            imageUrl: item.image || '',
            pillar: classifyPillar(item.name, item.description),
            type: classifyType(item.name, item.description),
            venue: location,
            price,
            source: SOURCE,
            url: item.url || '',
            time,
            coordinates: geo.latitude ? { lat: parseFloat(geo.latitude), lng: parseFloat(geo.longitude) } : null,
          })
        }
      } catch (err) {
        console.error(`[eventbrite] ${city} ${url} failed:`, err.message)
        errors.push(`${city} ${url.split('/').slice(-2, -1)[0]}: ${err.message}`)
      }

      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  error = errors.length ? errors.join('; ') : null
  return { events, error }
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(({ events, error }) => {
    if (error) console.error(`[eventbrite] Error: ${error}`)
    console.log(`Got ${events.length} events from Eventbrite`)
    events.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(6)} | ${e.name.slice(0, 60)}`))
  }).catch(e => console.error(e))
}
