// Venue image lookup — Wikipedia first, then Wikimedia Commons (free, no key).
const axios = require('axios')

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'CultureConcierge/1.0 (venue image finder; contact@cultureconcierge.com)'

const BAD_TITLE_TERMS = ['logo', 'coat of arms', 'seal of', 'flag of', 'map of', 'locator', 'icon', 'en-', 'siteplan', 'floor plan', 'wikidata']

async function wikiGet(api, params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(api, {
        headers: { 'User-Agent': UA },
        params: { ...params, format: 'json', origin: '*' },
        timeout: 10000,
      })
      return data
    } catch (err) {
      const status = err.response?.status
      if (status === 429 && attempt < retries) {
        const wait = 5000 * (attempt + 1)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
}

function looksLikePhoto(title) {
  const t = (title || '').toLowerCase()
  if (BAD_TITLE_TERMS.some(term => t.includes(term))) return false
  return /\.(jpe?g|png|webp|tiff?)$/.test(title || '')
}

function titleMatchesVenue(title, venueName) {
  const tokens = (value) => String(value || '')
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|tiff?)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !['the', 'and', 'of', 'in', 'at', 'by'].includes(word))
  const venueTokens = [...new Set(tokens(venueName))]
  const titleTokens = new Set(tokens(title))
  if (!venueTokens.length) return false
  const matched = venueTokens.filter((word) => titleTokens.has(word)).length
  return matched / venueTokens.length >= 0.67
}

async function findWikipediaImage(title, venueName = title) {
  const data = await wikiGet(WIKI_API, {
    action: 'query',
    titles: title,
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: 600,
  })
  const pages = data.query?.pages
  if (!pages) return ''
  for (const id of Object.keys(pages)) {
    const p = pages[id]
    if (p.thumbnail?.source && titleMatchesVenue(p.title, venueName)) return p.thumbnail.source
  }
  return ''
}

async function searchWikipediaImage(query, city, venueName = query) {
  const data = await wikiGet(WIKI_API, {
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: 5,
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: 600,
    exlimit: 5,
  })
  const pages = data.query?.pages
  if (!pages) return ''
  for (const id of Object.keys(pages)) {
    const p = pages[id]
    if (!p.thumbnail?.source) continue
    if (city && p.title.toLowerCase() === city.toLowerCase()) continue
    if (!titleMatchesVenue(p.title, venueName)) continue
    return p.thumbnail.source
  }
  return ''
}

async function searchCommonsImage(query, venueName = query) {
  const data = await wikiGet(COMMONS_API, {
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: 6,
    gsrlimit: 8,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: 600,
  })
  const pages = data.query?.pages
  if (!pages) return ''
  for (const id of Object.keys(pages)) {
    const p = pages[id]
    const img = p.imageinfo?.[0]
    if (!img) continue
    if (!looksLikePhoto(p.title)) continue
    if (p.title.toLowerCase().includes('tail sign') || p.title.toLowerCase().includes('banner')) continue
    if (!titleMatchesVenue(p.title, venueName)) continue
    return img.thumburl || img.url || ''
  }
  return ''
}

// Ordered fallback chain: exact wiki page -> wiki search -> commons search.
async function lookupVenueImages(name, city) {
  const urls = []
  if (!name) return urls

  const lookup = async (label, callback) => {
    try {
      const image = await callback()
      if (image) urls.push(image)
    } catch (err) {
      console.warn(`[venue-images] ${label} lookup failed for "${name}": ${err.message}`)
    }
  }

  if (city) {
    await lookup('exact city page', () => findWikipediaImage(`${name}, ${city}`, name))
  }
  await lookup('exact venue page', () => findWikipediaImage(name, name))
  if (city) {
    await lookup('city Wikipedia search', () => searchWikipediaImage(`"${name}" ${city}`, city, name))
  }
  await lookup('Wikipedia search', () => searchWikipediaImage(`"${name}"`, city, name))
  await lookup('Wikimedia Commons search', () => searchCommonsImage(`"${name}" ${city || ''}`.trim(), name))

  return [...new Set(urls)]
}

module.exports = { lookupVenueImages, searchCommonsImage, findWikipediaImage, searchWikipediaImage }