const axios = require('axios')
const { classifyType } = require('../utils/eventClassifier')

const SOURCE = 'tixafrica'

const API_URL = 'https://core.tix.africa/graphql'

// Tix Africa covers Nigeria + Kenya (no Rwanda listings), so Kigali is skipped.
const CITY_COUNTRY = {
  Lagos: 'NG',
  Abuja: 'NG',
  Nairobi: 'KE',
}

const DISCOVERY_QUERY = `
query Discover($country: SupportedCountries, $keyword: String, $page: Int, $per: Int) {
  fetchDiscoveryEvents(country: $country, keyword: $keyword, page: $page, per: $per) {
    events {
      edges {
        node {
          id
          slug
          title
          address
          locationName
          country
          startDate
          eventType
          headerImage
          discoveryImage
          currency
          tickets {
            edges {
              node {
                price
                status
              }
            }
          }
        }
      }
    }
  }
}`

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

function extractCity(text) {
  if (!text) return ''
  const t = text.toLowerCase()
  if (/\blagos\b/.test(t)) return 'Lagos'
  if (/\babuja\b/.test(t)) return 'Abuja'
  if (/\bkigali\b/.test(t)) return 'Kigali'
  if (/\bnairobi\b/.test(t)) return 'Nairobi'
  return ''
}

function extractTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr * 1000)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (_) { return '' }
}

function minPrice(tickets) {
  const prices = (tickets || [])
    .map(t => parseFloat(t?.price))
    .filter(n => !isNaN(n) && n > 0)
  if (!prices.length) return ''
  const min = Math.min(...prices)
  return min === 0 ? 'Free' : String(min)
}

async function fetchCity(city) {
  const events = []
  const seen = new Set()

  for (let page = 1; page <= 3; page++) {
    const { data } = await axios.post(API_URL, {
      query: DISCOVERY_QUERY,
      variables: { country: CITY_COUNTRY[city], keyword: city, page, per: 50 },
    }, { timeout: 20000 })

    const edges = data?.data?.fetchDiscoveryEvents?.events?.edges || []
    if (!edges.length) break

    for (const { node } of edges) {
      if (!node || !node.title) continue
      if (node.eventType === 'online') continue
      if (seen.has(node.slug)) continue
      seen.add(node.slug)

      const date = new Date(node.startDate * 1000)
      if (isNaN(date.getTime())) continue

      const cityFromAddress = extractCity(`${node.locationName || ''} ${node.address || ''}`)
      const eventCity = cityFromAddress || city

      events.push({
        name: node.title.trim(),
        city: eventCity,
        date,
        description: '',
        imageUrl: node.discoveryImage || node.headerImage || '',
        pillar: classifyPillar(node.title, node.address || ''),
        type: classifyType(node.title, ''),
        venue: node.locationName || '',
        price: minPrice(node.tickets?.edges?.map(e => e.node) || []),
        source: SOURCE,
        url: `https://www.tix.africa/discover/${node.slug}`,
        time: extractTime(node.startDate),
        coordinates: null,
      })
    }

    if (edges.length < 50) break
  }

  return events
}

async function scrape() {
  const events = []

  for (const city of Object.keys(CITY_COUNTRY)) {
    try {
      const cityEvents = await fetchCity(city)
      events.push(...cityEvents)
      console.log(`[tixafrica] ${city}: ${cityEvents.length} events`)
    } catch (err) {
      console.error(`[tixafrica] ${city} failed:`, err.message)
    }
  }

  return events
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`Got ${r.length} events from Tix Africa`)
    r.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(6)} | ${e.name.slice(0, 60)}`))
  }).catch(e => console.error(e))
}
