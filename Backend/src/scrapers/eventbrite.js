const axios = require('axios')
const cheerio = require('cheerio')

const SOURCE = 'eventbrite'

const CITY_URLS = {
  Lagos: 'https://www.eventbrite.com/d/nigeria--lagos/events/',
  Abuja: 'https://www.eventbrite.com/d/nigeria--abuja/events/',
  Nairobi: 'https://www.eventbrite.com/d/kenya--nairobi/events/',
  Kigali: 'https://www.eventbrite.com/d/rwanda--kigali/events/',
}

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

async function scrape() {
  const events = []

  for (const [city, url] of Object.entries(CITY_URLS)) {
    try {
      const { data: html } = await axios.get(url, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      })

      const $ = cheerio.load(html)
      const ldScript = $('script[type="application/ld+json"]').first()
      if (!ldScript.length) {
        console.error(`[eventbrite] ${city}: no JSON-LD found`)
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
          type: '',
          venue: location,
          price,
          source: SOURCE,
          url: item.url || '',
          time,
          coordinates: geo.latitude ? { lat: parseFloat(geo.latitude), lng: parseFloat(geo.longitude) } : null,
        })
      }
    } catch (err) {
      console.error(`[eventbrite] ${city} failed:`, err.message)
    }
  }

  return events
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`Got ${r.length} events from Eventbrite`)
    r.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(6)} | ${e.name.slice(0, 60)}`))
  }).catch(e => console.error(e))
}
