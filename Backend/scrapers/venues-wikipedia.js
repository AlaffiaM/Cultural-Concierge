const axios = require('axios')

const SOURCE = 'wikipedia'

const CITIES = [
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja', country: 'Nigeria', lat: 9.0765, lng: 7.3986 },
  { name: 'Kigali', country: 'Rwanda', lat: -1.9441, lng: 30.0619 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
]

const USER_AGENT = 'CultureConcierge/1.0 (venue image finder; contact@cultureconcierge.com)'
const API = 'https://en.wikipedia.org/w/api.php'

async function wikiRequest(params) {
  const { data } = await axios.get(API, {
    headers: { 'User-Agent': USER_AGENT },
    params: { format: 'json', origin: '*', ...params },
    timeout: 15000,
  })
  return data
}

function isExcluded(title) {
  const t = title.toLowerCase()
  if (/^list\s+of/i.test(t)) return true
  if (/\b(street|road|avenue|highway|motorway|cemetery|hospital|clinic|bank|embassy|consulate|prison)\b/i.test(t)) return true
  if (['market', 'shopping mall', 'supermarket', 'store', 'shop', 'retail'].some(x => t.includes(x))) return true
  return false
}

async function searchVenues(city) {
  const seen = new Set()
  const venues = []

  const geoData = await wikiRequest({
    action: 'query',
    list: 'geosearch',
    gscoord: `${city.lat}|${city.lng}`,
    gsradius: 5000,
    gslimit: 50,
  })

  const geoPages = geoData.query?.geosearch || []
  for (const page of geoPages) {
    if (isExcluded(page.title)) continue
    seen.add(page.title)
    venues.push({
      name: page.title,
      imageUrl: '',
      coordinates: page.lat != null ? { lat: page.lat, lng: page.lon } : null,
    })
  }

  if (geoPages.length > 0) {
    const titles = geoPages.filter(p => !isExcluded(p.title)).map(p => p.title).join('|')
    if (titles) {
      const detailData = await wikiRequest({
        action: 'query',
        titles,
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: 600,
        exlimit: 50,
      })
      const detailPages = detailData.query?.pages || {}
      for (const id of Object.keys(detailPages)) {
        const p = detailPages[id]
        const existing = venues.find(v => v.name === p.title)
        if (existing) {
          existing.imageUrl = p.thumbnail?.source || ''
        }
      }
    }
  }

  return venues
}

async function scrape() {
  const all = []
  for (const city of CITIES) {
    console.log(`[wikipedia] ${city.name}: finding images...`)
    const venues = await searchVenues(city)
    console.log(`[wikipedia] ${city.name}: ${venues.length} venues found`)

    for (const v of venues) {
      all.push({
        name: v.name,
        city: city.name,
        type: '',
        pillar: 'CULTURE',
        description: '',
        tip: '',
        address: '',
        vibeTags: [],
        tags: [],
        images: v.imageUrl ? [v.imageUrl] : [],
        coordinates: v.coordinates,
        source: SOURCE,
      })
    }

    await new Promise(r => setTimeout(r, 2000))
  }

  return all
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`\nTotal: ${r.length} venues`)
    const byCity = {}
    for (const v of r) { byCity[v.city] = (byCity[v.city] || 0) + 1 }
    for (const [city, n] of Object.entries(byCity)) console.log(`  ${city}: ${n}`)
    const withImg = r.filter(v => v.images && v.images[0]).length
    console.log(`With images: ${withImg}/${r.length}`)
    console.log()
    r.forEach(v => console.log(`${v.images[0] ? '📷' : '  '} ${v.name.padEnd(50)} ${v.city.padEnd(8)}`))
  }).catch(e => console.error(e))
}
