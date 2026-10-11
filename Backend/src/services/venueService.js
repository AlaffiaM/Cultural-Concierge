const axios = require('axios')
const Venue = require('../models/Venue')
const { getEntries, isBlocked } = require('./blocklistService')
const { lookupVenueImages } = require('./venueImageService')

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase()
}

async function findExisting(name, city) {
  const slug = normalizeName(name).slice(0, 60)
  if (!slug) return null
  return Venue.findOne({
    name: { $regex: `^${escapeRegex(slug)}`, $options: 'i' },
    city: { $regex: `^${escapeRegex(String(city || '').trim())}$`, $options: 'i' },
  })
}

// Ingests scraped venues as `status: 'scraped'` for admin review, applying the
// venue blocklist and tighter name+city dedup.
let ingestRunning = null
async function ingestScrapedVenues(source) {
  if (ingestRunning) {
    console.warn(`[venues] ingest already running for "${ingestRunning}" — skipping "${source}"`)
    return { source, fetched: 0, new: 0, skipped: 0, blocked: 0, alreadyRunning: true }
  }
  ingestRunning = source
  try {
    const scraper = require(`../scrapers/venues-${source}`)
    const scraped = await scraper.scrape()
    const blockEntries = await getEntries('venue')

    const newVenues = []
    let blocked = 0
    let skipped = 0

    for (const data of scraped) {
      const name = String(data.name || '').trim()
      if (!name) {
        skipped++
        continue
      }
      if (isBlocked(blockEntries, name, data.city)) {
        console.log(`[venues] BLOCKED: "${name}"`)
        blocked++
        continue
      }

      const existing = await findExisting(name, data.city)
      if (existing) {
        skipped++
        continue
      }

      const venue = await Venue.create({
        name,
        city: data.city,
        type: data.type || 'Venue',
        pillar: data.pillar || 'CULTURE',
        tags: data.tags || [],
        vibeTags: data.vibeTags || [],
        description: data.description || '',
        tip: data.tip || '',
        address: data.address || '',
        images: data.images || [],
        coordinates: data.coordinates || null,
        source: data.source || source,
        status: 'scraped',
      })
      newVenues.push(venue)
    }

    return { source, fetched: scraped.length, new: newVenues.length, skipped, blocked, venues: newVenues }
  } finally {
    ingestRunning = null
  }
}

async function generateVenueDescription(name, city) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: `Write a 1-2 sentence description and a one-line visitor tip for this venue in ${city}. Plain text, no markdown. Venue: ${name}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    },
    { timeout: 20000 }
  )
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Called when an admin approves a venue: fills missing images (Wikipedia +
// Commons) only when the result title matches the venue name.
async function enrichApprovedVenue(venue) {
  const updates = {}
  try {
    if (!(venue.images || []).length) {
      const urls = await lookupVenueImages(venue.name, venue.city)
      if (urls.length) updates.images = urls.slice(0, 3)
    }
    if (!venue.description && process.env.GEMINI_API_KEY) {
      const desc = await generateVenueDescription(venue.name, venue.city)
      if (desc) updates.description = desc.trim()
    }
  } catch (err) {
    console.warn(`[venues] enrich failed for "${venue.name}": ${err.message}`)
  }
  if (Object.keys(updates).length) {
    await Venue.findByIdAndUpdate(venue._id, updates)
  }
  return updates
}

module.exports = { ingestScrapedVenues, enrichApprovedVenue, generateVenueDescription }