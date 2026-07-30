const express = require('express')
const router = express.Router()
const Venue = require('../models/Venue')
const { requireAdmin } = require('../middleware/admin')
const { escapeRegex } = require('../utils/sanitize')
const axios = require('axios')

const VENUE_SCRAPER_SOURCES = ['gemini', 'wikipedia']

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const UA = 'CultureConcierge/1.0 (venue lookup; contact@cultureconcierge.com)'

// GET /api/venues/lookup — lookup a Wikipedia image for a venue name (admin)
router.get('/lookup', requireAdmin, async (req, res) => {
  try {
    const { name, city } = req.query
    if (!name) return res.status(400).json({ message: 'name query param required' })

    async function findImage(title) {
      const { data } = await axios.get(WIKI_API, {
        headers: { 'User-Agent': UA },
        params: { action: 'query', titles: title, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 600, format: 'json', origin: '*' },
        timeout: 10000,
      })
      const pages = data.query?.pages
      if (!pages) return ''
      for (const id of Object.keys(pages)) {
        const p = pages[id]
        if (p.thumbnail?.source) return p.thumbnail.source
      }
      return ''
    }

    async function searchImage(query) {
      const { data } = await axios.get(WIKI_API, {
        headers: { 'User-Agent': UA },
        params: { action: 'query', generator: 'search', gsrsearch: query, gsrlimit: 5, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 600, exlimit: 5, format: 'json', origin: '*' },
        timeout: 10000,
      })
      const pages = data.query?.pages
      if (!pages) return ''
      for (const id of Object.keys(pages)) {
        const p = pages[id]
        if (!p.thumbnail?.source) continue
        if (city && p.title.toLowerCase() === city.toLowerCase()) continue
        return p.thumbnail.source
      }
      return ''
    }

    let imageUrl = ''
    if (city) imageUrl = await findImage(`${name}, ${city}`)
    if (!imageUrl) imageUrl = await findImage(name)
    if (!imageUrl && city) imageUrl = await searchImage(`"${name}" ${city}`)
    if (!imageUrl) imageUrl = await searchImage(name)

    res.json({ imageUrl })
  } catch (err) {
    console.error('[venues] lookup error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// POST /api/venues/batch-enrich — find Wikipedia images for venues missing them (admin)
router.post('/batch-enrich', requireAdmin, async (req, res) => {
  try {
    const { city } = req.body
    const filter = { $or: [{ images: { $exists: false } }, { images: { $eq: [] } }, { images: null }] }
    if (city) filter.city = city

    const venues = await Venue.find(filter).select('name city images').lean()
    if (venues.length === 0) return res.json({ enriched: 0, skipped: 0, total: 0, message: 'All venues already have images.' })

    async function wikiGet(params) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data } = await axios.get(WIKI_API, { headers: { 'User-Agent': UA }, params: { ...params, format: 'json', origin: '*' }, timeout: 10000 })
          return data
        } catch (err) {
          const status = err.response?.status
          const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '0', 10) || 5
          if (status === 429 && attempt < 2) {
            const wait = retryAfter * 1000 + attempt * 2000
            console.log(`[batch-enrich] rate limited, waiting ${wait}ms before retry ${attempt + 1}`)
            await new Promise(r => setTimeout(r, wait))
            continue
          }
          throw err
        }
      }
    }

    let enriched = 0, skipped = 0, rateLimited = 0, notFound = 0

    for (let i = 0; i < venues.length; i++) {
      const v = venues[i]
      let imageUrl = ''
      let reason = ''
      try {
        const data = await wikiGet({ action: 'query', titles: `${v.name}, ${v.city}`, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 600 })
        const pages = data.query?.pages
        if (pages) {
          for (const id of Object.keys(pages)) {
            const p = pages[id]
            if (p.thumbnail?.source) { imageUrl = p.thumbnail.source; break }
          }
        }
        if (!imageUrl) {
          const sdata = await wikiGet({ action: 'query', generator: 'search', gsrsearch: `"${v.name}" ${v.city}`, gsrlimit: 5, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 600, exlimit: 5 })
          const spages = sdata.query?.pages
          if (spages) {
            for (const id of Object.keys(spages)) {
              const p = spages[id]
              if (!p.thumbnail?.source) continue
              if (p.title.toLowerCase() === v.city.toLowerCase()) continue
              imageUrl = p.thumbnail.source
              break
            }
          }
        }
        if (!imageUrl) { reason = 'no image found on Wikipedia'; notFound++ }
      } catch (err) {
        if (err.response?.status === 429) { rateLimited++; reason = 'rate limited after retries' }
        else { reason = err.message }
        console.log(`[batch-enrich] failed for "${v.name}": ${reason}`)
      }

      if (imageUrl) {
        await Venue.findByIdAndUpdate(v._id, { $push: { images: imageUrl } })
        enriched++
      } else {
        skipped++
      }

      if (i % 5 === 0 || imageUrl) console.log(`[batch-enrich] ${i + 1}/${venues.length}: "${v.name}" -> ${imageUrl ? 'image found' : 'skipped (' + reason + ')'}`)
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000))
    }

    let message = `Enriched: ${enriched}, Skipped: ${skipped}`
    if (rateLimited > 0) message += ` (${rateLimited} rate-limited)`

    res.json({ enriched, skipped, total: venues.length, rateLimited, notFound, message })
  } catch (err) {
    console.error('[venues] batch-enrich error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// GET /api/venues — return venues with pagination (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: { $in: ['active', 'inactive'] } }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200)
    const skip = (page - 1) * limit

    const [venues, total] = await Promise.all([
      Venue.find(filter)
        .lean()
        .select('name city type pillar vibeTags tags description tip address images coordinates source status updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Venue.countDocuments(filter),
    ])

    res.json({ venues, total, page, totalPages: Math.ceil(total / limit) || 1 })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// GET /api/venues/:city — return venues for one city (case-insensitive)
router.get('/:city', async (req, res) => {
  try {
    const venues = await Venue.find({
      city: { $regex: escapeRegex(req.params.city), $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }).lean().select('name city type pillar vibeTags tags description tip address images coordinates source status updatedAt')
    res.json(venues)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// GET /api/venues/vibes/:city — vibe-matched search
router.get('/vibes/:city', async (req, res) => {
  try {
    const { vibe, q } = req.query
    const filter = {
      city: { $regex: escapeRegex(req.params.city), $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }
    if (vibe) {
      const vibes = vibe.split(',').map(v => new RegExp(v.trim(), 'i'))
      filter.vibeTags = { $in: vibes }
    }
    if (q && q.length >= 2) {
      const text = escapeRegex(q.trim())
      filter.$or = [
        { name: { $regex: text, $options: 'i' } },
        { description: { $regex: text, $options: 'i' } },
        { vibeTags: { $regex: text, $options: 'i' } },
      ]
    }
    let venues = await Venue.find(filter).lean()
    if (vibe) {
      const requested = vibe.split(',').map(v => v.trim().toLowerCase())
      venues = venues.map(venue => {
        const matchCount = (venue.vibeTags || []).filter(t =>
          requested.includes(t.toLowerCase())
        ).length
        return { ...venue, vibeScore: matchCount }
      }).sort((a, b) => b.vibeScore - a.vibeScore)
    }
    res.json(venues)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// GET /api/venues/upcoming/:city — venues that have upcoming approved events
router.get('/upcoming/:city', async (req, res) => {
  try {
    const Event = require('../models/Event')
    const upcomingEventVenueIds = await Event.distinct('linkedSpotId', {
      city: { $regex: escapeRegex(req.params.city), $options: 'i' },
      status: 'approved',
      date: { $gte: new Date() },
    })
    const venues = await Venue.find({
      _id: { $in: upcomingEventVenueIds },
      city: { $regex: escapeRegex(req.params.city), $options: 'i' },
    })
    res.json(venues)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// POST /api/venues — create a new venue (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const venue = new Venue({
      name: req.body.name,
      city: req.body.city,
      type: req.body.type,
      pillar: req.body.pillar,
      vibeTags: req.body.vibeTags || [],
      tags: req.body.tags || [],
      description: req.body.description,
      tip: req.body.tip,
      address: req.body.address,
      images: req.body.images || [],
      coordinates: req.body.coordinates,
      source: req.body.source || 'manual',
      status: req.body.status || 'scraped',
    })
    const saved = await venue.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/venues/:id — update a venue (admin)
const VENUE_ALLOWED_UPDATES = ['name', 'city', 'type', 'pillar', 'vibeTags', 'tags', 'description', 'tip', 'address', 'images', 'coordinates', 'status']
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const updates = {}
    for (const key of VENUE_ALLOWED_UPDATES) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const venue = await Venue.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true })
    if (!venue) return res.status(404).json({ message: 'Venue not found' })
    res.json(venue)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/venues/:id — delete a venue (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id)
    if (!venue) return res.status(404).json({ message: 'Venue not found' })
    res.json({ message: 'Venue deleted' })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// POST /api/venues/scraper/run — run a venue scraper (admin)
router.post('/scraper/run', requireAdmin, async (req, res) => {
  try {
    const { source } = req.body
    console.log('[venues] scraper/run called with source:', source)
    if (!source || !VENUE_SCRAPER_SOURCES.includes(source)) {
      return res.status(400).json({ message: `Invalid source. Valid: ${VENUE_SCRAPER_SOURCES.join(', ')}` })
    }

    const scraper = require(`../scrapers/venues-${source}`)
    console.log('[venues] scraper module loaded, running scrape()')
    const scraped = await scraper.scrape()
    console.log('[venues] scrape() returned', scraped.length, 'results')

    const newVenues = []
    for (const data of scraped) {
      const slug = data.name.toLowerCase().trim().slice(0, 60)
      const existing = await Venue.findOne({
        name: { $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
        city: data.city,
      })
      if (!existing) {
        const venue = new Venue({
          name: data.name,
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
        await venue.save()
        newVenues.push(venue)
      }
    }

    res.json({
      source,
      fetched: scraped.length,
      new: newVenues.length,
      skipped: scraped.length - newVenues.length,
      venues: newVenues,
    })
  } catch (err) {
    console.error('[venues] scraper/run error:', err.stack || err)
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// POST /api/venues/scraper/accept — accept scraped venues (admin)
router.post('/scraper/accept', requireAdmin, async (req, res) => {
  try {
    const { venueIds } = req.body
    if (!venueIds || !Array.isArray(venueIds) || venueIds.length === 0) {
      return res.status(400).json({ message: 'venueIds array is required' })
    }

    const result = await Venue.updateMany(
      { _id: { $in: venueIds } },
      { $set: { status: 'inactive' } }
    )

    res.json({ modified: result.modifiedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

module.exports = router
