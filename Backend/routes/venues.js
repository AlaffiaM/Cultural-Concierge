const express = require('express')
const router = express.Router()
const Venue = require('../models/Venue')
const { requireAdmin } = require('../middleware/admin')

const VENUE_SCRAPER_SOURCES = ['gemini']

// GET /api/venues — return venues with pagination (public)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: { $in: ['active', 'inactive'] } }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' }
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
    res.status(500).json({ message: err.message })
  }
})

// GET /api/venues/:city — return venues for one city (case-insensitive)
router.get('/:city', async (req, res) => {
  try {
    const venues = await Venue.find({
      city: { $regex: req.params.city, $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }).lean().select('name city type pillar vibeTags tags description tip address images coordinates source status updatedAt')
    res.json(venues)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/venues/vibes/:city — vibe-matched search
router.get('/vibes/:city', async (req, res) => {
  try {
    const { vibe, q } = req.query
    const filter = {
      city: { $regex: req.params.city, $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }
    if (vibe) {
      const vibes = vibe.split(',').map(v => new RegExp(v.trim(), 'i'))
      filter.vibeTags = { $in: vibes }
    }
    if (q && q.length >= 2) {
      const text = q.trim()
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
    res.status(500).json({ message: err.message })
  }
})

// GET /api/venues/upcoming/:city — venues that have upcoming approved events
router.get('/upcoming/:city', async (req, res) => {
  try {
    const Event = require('../models/Event')
    const upcomingEventVenueIds = await Event.distinct('linkedSpotId', {
      city: { $regex: req.params.city, $options: 'i' },
      status: 'approved',
      date: { $gte: new Date() },
    })
    const venues = await Venue.find({
      _id: { $in: upcomingEventVenueIds },
      city: { $regex: req.params.city, $options: 'i' },
    })
    res.json(venues)
  } catch (err) {
    res.status(500).json({ message: err.message })
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
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
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
    res.status(500).json({ message: err.message })
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
    res.status(500).json({ message: err.message })
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
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
