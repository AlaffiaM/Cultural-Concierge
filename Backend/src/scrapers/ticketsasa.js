const axios = require('axios')
const cheerio = require('cheerio')

const SOURCE = 'ticketsasa'
const BASE_URL = 'https://www.ticketsasa.com/events'

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
  if (/\bkenya\b/.test(t)) return 'Nairobi'
  if (/\brwanda\b/.test(t)) return 'Kigali'
  if (/\bnigeria\b/.test(t)) return 'Lagos'
  if (/\bakwas\b/.test(t)) return 'Lagos'
  return 'Nairobi'
}

function parseDate(dateStr) {
  if (!dateStr) return null
  const cleaned = dateStr.replace(/^\w{3,4}\s+/, '').trim()
  const parsed = new Date(cleaned)
  if (isNaN(parsed.getTime())) return null
  if (parsed < new Date()) return null
  return parsed
}

function resolveStr(payload, val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return resolveStr(payload, payload[val])
  if (Array.isArray(val) && val.length === 2 && val[0] === 'ShallowReactive')
    return resolveStr(payload, val[1])
  return ''
}

function resolveArr(payload, val) {
  if (val === null || val === undefined) return []
  if (typeof val === 'number') return resolveArr(payload, payload[val])
  if (Array.isArray(val)) {
    if (val.length === 2 && val[0] === 'ShallowReactive')
      return resolveArr(payload, val[1])
    return val.map(v => resolveArr(payload, v))
  }
  if (typeof val === 'object' && val !== null) {
    const obj = {}
    for (const [k, v] of Object.entries(val)) {
      obj[k] = v
    }
    return obj
  }
  return []
}

function extractImageMapFromPayload(html) {
  const ch = cheerio.load(html)
  const script = ch('script[type="application/json"]').first()
  if (!script.length) return {}
  const raw = script.html().trim()
  const payload = JSON.parse(raw)
  const dataMap = payload[3]
  if (!dataMap) return {}

  for (const [, idx] of Object.entries(dataMap)) {
    const val = payload[idx]
    if (!Array.isArray(val) || !val.length) continue
    const firstItem = payload[val[0]]
    if (!firstItem || typeof firstItem !== 'object' || !firstItem.main_image) continue

    const slugToImage = {}
    for (const ptr of val) {
      const item = payload[ptr]
      if (!item || typeof item !== 'object') continue
      const slug = resolveStr(payload, item.slug_name)
      const img = resolveStr(payload, item.main_image)
      if (slug && img) {
        slugToImage['/events/' + slug] = img
      }
    }
    return slugToImage
  }
  return {}
}

async function scrape() {
  const events = []
  let imageMap = {}

  try {
    const { data: html } = await axios.get(BASE_URL, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })

    imageMap = extractImageMapFromPayload(html)

    const $ = cheerio.load(html)

    $('.v-card').each((i, card) => {
      const $card = $(card)
      const name = $card.find('.event-name').attr('title') || $card.find('.event-name').text().trim()
      if (!name || name.length < 3) return

      const dateText = $card.find('.event-date').text().trim()
      const date = parseDate(dateText)
      if (!date) return

      const location = $card.find('.event-location').attr('title') || ''
      const city = extractCity(location)
      const price = $card.find('.tkt-price').text().trim()
      const href = $card.find('.event-name').attr('href') || ''
      const url = href.startsWith('http') ? href : `https://www.ticketsasa.com${href}`
      const pillar = classifyPillar(name, '')
      const imageUrl = imageMap[href] || ''

      events.push({
        name,
        city,
        date,
        description: '',
        imageUrl,
        pillar,
        type: 'Scraped',
        venue: location,
        source: SOURCE,
        url,
        price,
      })
    })
  } catch (err) {
    console.error('[ticketsasa] Scrape failed:', err.message)
  }

  return events
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`Got ${r.length} events from ticketsasa`)
    r.forEach(e => console.log(`  ${e.date.toISOString().slice(0,10)} | ${e.name} | venue:${(e.venue || '').slice(0,40)} | img:${e.imageUrl ? 'YES' : 'no'}`))
  }).catch(e => console.error(e))
}
