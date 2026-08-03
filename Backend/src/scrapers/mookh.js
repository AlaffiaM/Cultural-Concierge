const puppeteer = require('puppeteer')
const { install } = require('@puppeteer/browsers')

const SOURCE = 'mookh'

async function ensureChrome() {
  try {
    puppeteer.executablePath()
  } catch {
    console.log('[mookh] Chrome not found — installing...')
    await install({ browser: 'chrome', buildId: 'latest', cacheDir: '/opt/render/.cache/puppeteer' })
  }
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

function classifyPillar(name, desc) {
  const text = `${name} ${desc || ''}`.toLowerCase()
  if (/\b(wellness|yoga|meditation|spa|fitness|marathon|health|run|workout|sports?|pilates|retreat|massage|beauty|gym|exercise|nutrition|skincare|self.?care|mindfulness|therapy|healing|breathwork|recovery|stretch|body|soul)\b/.test(text)) return 'WELLNESS'
  if (/\b(brunch|dinner|wine|party|networking|night|social|food|drink|club|bar|happy.?hour|music|concert|festival|comedy|dance|after.?party|trivia|lounge|rooftop|sundowner|meetup|mixer|dining|restaurant|bar.?crawl|pub|cocktail|karaoke)\b/.test(text)) return 'SOCIAL'
  return 'CULTURE'
}

function extractMookhDate(text) {
  // Parse date from listing: "Sat 04 Oct" or "Mon 01 Jun"
  const m = text.match(/^\w{3}\s+(\d{1,2})\s+(\w{3})/)
  if (!m) return null
  const day = parseInt(m[1])
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)]
  if (month === undefined) return null
  const year = new Date().getFullYear()
  const d = new Date(year, month, day)
  if (isNaN(d.getTime())) return null
  // If date is in the past and more than 30 days ago, assume next year
  const now = new Date()
  if (d < new Date(now.getTime() - 30 * 86400000)) {
    d.setFullYear(year + 1)
  }
  return d
}

function extractTimeRange(text) {
  // Extract time range like "02:00 pm - 08:00 pm"
  const m = text.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i)
  return m ? m[1].trim() : ''
}

function extractVenue(text) {
  // Venue is the last part after the time range
  const m = text.match(/\d{1,2}:\d{2}\s*[ap]m\s*-\s*\d{1,2}:\d{2}\s*[ap]m\s+(.+)$/i)
  return m ? m[1].trim() : 'Nairobi'
}

function extractName(text) {
  // Name is between the month and the date range
  // Pattern: "{day} {date} {month} {NAME} {date_range}"
  const m = text.match(/^\w{3}\s+\d{1,2}\s+\w{3}\s+(.+?)\s+\w{3},/)
  if (m) return m[1].trim()
  // Fallback: between month and time
  const m2 = text.match(/^\w{3}\s+\d{1,2}\s+\w{3}\s+(.+?)\s+\d{1,2}:\d{2}/)
  return m2 ? m2[1].trim() : ''
}

function extractCity(text) {
  const lastLine = text.split('\n').pop() || text
  const t = lastLine.toLowerCase()
  if (/\bnairobi\b/.test(t)) return 'Nairobi'
  if (/\blagos\b/.test(t)) return 'Lagos'
  if (/\babuja\b/.test(t)) return 'Abuja'
  if (/\bkigali\b/.test(t)) return 'Kigali'
  return 'Nairobi'
}

async function scrape() {
  await ensureChrome()
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const events = []

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto('https://mookh.com/', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(r => setTimeout(r, 1500))
    }
    await new Promise(r => setTimeout(r, 2000))

    // Extract event cards
    const cards = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/event/"]')
      const seen = new Set()
      const results = []
      links.forEach(link => {
        const href = link.getAttribute('href')
        if (seen.has(href)) return
        seen.add(href)
        const text = link.innerText.replace(/\s+/g, ' ').trim()
        if (!text) return
        const img = link.querySelector('img')
        const nameEl = link.querySelector('h4')
        results.push({
          href,
          text,
          imageUrl: img ? img.getAttribute('src') : '',
          name: nameEl ? nameEl.innerText.trim() : '',
        })
      })
      return results
    })

    for (const card of cards) {
      if (!card.text || card.text.length < 10) continue

      const date = extractMookhDate(card.text)
      if (!date) continue

      const name = card.name || extractName(card.text)
      if (!name || name.length < 2) continue

      const time = extractTimeRange(card.text)
      const venue = extractVenue(card.text)
      const city = extractCity(card.text)

      events.push({
        name,
        city,
        date,
        description: '',
        imageUrl: card.imageUrl || '',
        pillar: classifyPillar(name, ''),
        type: '',
        venue,
        source: SOURCE,
        time,
        coordinates: null,
      })
    }
  } catch (err) {
    console.error('[mookh] Scrape failed:', err.message)
  } finally {
    await browser.close()
  }

  return events
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`Got ${r.length} events from Mookh`)
    r.forEach(e => console.log(`  ${e.date.toISOString().slice(0, 10)} | ${e.pillar.padEnd(8)} | ${e.city.padEnd(8)} | ${e.name.slice(0, 50)}`))
  }).catch(e => console.error(e))
}
