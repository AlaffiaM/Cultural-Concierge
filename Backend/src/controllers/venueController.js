const Venue = require('../models/Venue')
const Event = require('../models/Event')
const { escapeRegex, isValidObjectId, isValidObjectIdArray, parsePagination, validateVenuePayload } = require('../utils/sanitize')
const { rememberRejection } = require('../services/blocklistService')
const { ingestScrapedVenues, enrichApprovedVenue } = require('../services/venueService')
const { lookupVenueImages } = require('../services/venueImageService')

const VENUE_SCRAPER_SOURCES = ['gemini', 'wikipedia']
const VENUE_ALLOWED_UPDATES = ['name', 'city', 'type', 'pillar', 'vibeTags', 'tags', 'description', 'tip', 'address', 'images', 'coordinates', 'status']

async function lookupVenueImage(req, res) {
  try {
    const { name, city } = req.query
    if (!name) return res.status(400).json({ message: 'name query param required' })

    const imageUrl = (await lookupVenueImages(name, city))[0] || ''

    res.json({ imageUrl })
  } catch (err) {
    console.error('[venues] lookup error:', err.message)
    res.status(500).json({ message: err.message })
  }
}

async function batchEnrichVenues(req, res) {
  try {
    const { city } = req.body
    const filter = { $or: [{ images: { $exists: false } }, { images: { $eq: [] } }, { images: null }] }
    if (city) filter.city = city

    const venues = await Venue.find(filter).select('name city images').lean()
    if (venues.length === 0) return res.json({ enriched: 0, skipped: 0, total: 0, message: 'All venues already have images.' })

    let enriched = 0, skipped = 0, notFound = 0

    for (let i = 0; i < venues.length; i++) {
      const v = venues[i]
      let urls = []
      try {
        // Wikipedia -> Wikimedia Commons chain, no API key required.
        urls = await lookupVenueImages(v.name, v.city)
      } catch (err) {
        console.log(`[batch-enrich] failed for "${v.name}": ${err.message}`)
      }

      if (urls.length) {
        await Venue.findByIdAndUpdate(v._id, { $set: { images: urls } })
        enriched++
      } else {
        skipped++
        notFound++
      }

      if (i % 5 === 0 || urls.length) console.log(`[batch-enrich] ${i + 1}/${venues.length}: "${v.name}" -> ${urls.length ? `image found (${urls[0]})` : 'not found'}`)
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))
    }

    let message = `Enriched: ${enriched}, Skipped: ${skipped}`
    res.json({ enriched, skipped, total: venues.length, notFound, message })
  } catch (err) {
    console.error('[venues] batch-enrich error:', err.message)
    res.status(500).json({ message: err.message })
  }
}

async function listVenues(req, res) {
  try {
    if (req.query.city !== undefined &&
        (typeof req.query.city !== 'string' || req.query.city.length > 80)) {
      return res.status(400).json({ message: 'city must be a string of 80 characters or fewer.' })
    }
    const filter = req.query.all === 'true' ? {} : { status: { $in: ['active', 'inactive'] } }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }

    const pagination = parsePagination(req.query, 50, 200)
    if (!pagination) return res.status(400).json({ message: 'page and limit must be valid positive integers.' })
    const { page, limit, skip } = pagination

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
}

async function getVenuesByCity(req, res) {
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
}

async function getVenuesByVibe(req, res) {
  try {
    const { vibe, q } = req.query
    if (vibe !== undefined && (typeof vibe !== 'string' || vibe.length > 300)) {
      return res.status(400).json({ message: 'vibe must be a comma-separated list of up to six tags.' })
    }
    if (q !== undefined && (typeof q !== 'string' || q.length > 120)) {
      return res.status(400).json({ message: 'q must be a search string of 120 characters or fewer.' })
    }
    const requestedVibes = vibe ? vibe.split(',').map(value => value.trim()) : []
    if (requestedVibes.length > 6 || requestedVibes.some(value => !value || value.length > 50)) {
      return res.status(400).json({ message: 'vibe must contain up to six non-empty tags of 50 characters or fewer.' })
    }
    const filter = {
      city: { $regex: escapeRegex(req.params.city), $options: 'i' },
      status: { $in: ['active', 'inactive'] },
    }
    if (vibe) {
      const vibes = requestedVibes.map(value => new RegExp(escapeRegex(value), 'i'))
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
      const requested = requestedVibes.map(value => value.toLowerCase())
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
}

async function getUpcomingVenuesByCity(req, res) {
  try {
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
}

async function createVenue(req, res) {
  try {
    const validation = validateVenuePayload(req.body)
    if (!validation.isValid) {
      return res.status(400).json({ message: 'Invalid venue payload', errors: validation.errors })
    }
    const data = validation.sanitized
    const venue = new Venue({
      name: data.name,
      city: data.city,
      type: data.type,
      pillar: data.pillar,
      vibeTags: data.vibeTags || [],
      tags: data.tags || [],
      description: data.description,
      tip: data.tip,
      address: data.address,
      images: data.images || [],
      coordinates: data.coordinates,
      source: data.source || 'manual',
      status: data.status || 'scraped',
    })
    const saved = await venue.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function updateVenue(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid venue ID.' })
    const validation = validateVenuePayload(req.body, { partial: true })
    if (!validation.isValid) {
      return res.status(400).json({ message: 'Invalid venue payload', errors: validation.errors })
    }
    const updates = {}
    for (const key of VENUE_ALLOWED_UPDATES) {
      if (validation.sanitized[key] !== undefined) updates[key] = validation.sanitized[key]
    }
    const venue = await Venue.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true })
    if (!venue) return res.status(404).json({ message: 'Venue not found' })
    res.json(venue)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function deleteVenue(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid venue ID.' })
    const venue = await Venue.findByIdAndDelete(req.params.id)
    if (!venue) return res.status(404).json({ message: 'Venue not found' })
    if (venue.source && venue.source !== 'manual') {
      try {
        await rememberRejection('venue', { name: venue.name, city: venue.city, source: venue.source })
      } catch (err) {
        console.warn(`[venues] could not skip-list "${venue.name}": ${err.message}`)
      }
    }
    res.json({ message: 'Venue deleted' })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function runVenueScraper(req, res) {
  try {
    const { source } = req.body
    console.log('[venues] scraper/run called with source:', source)
    if (!source || !VENUE_SCRAPER_SOURCES.includes(source)) {
      return res.status(400).json({ message: `Invalid source. Valid: ${VENUE_SCRAPER_SOURCES.join(', ')}` })
    }

    const result = await ingestScrapedVenues(source)
    res.json(result)
  } catch (err) {
    console.error('[venues] scraper/run error:', err.stack || err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function acceptScrapedVenues(req, res) {
  try {
    const { venueIds } = req.body
    if (!isValidObjectIdArray(venueIds)) {
      return res.status(400).json({ message: 'venueIds must be a non-empty array of valid IDs.' })
    }

    const result = await Venue.updateMany(
      { _id: { $in: venueIds }, status: 'scraped' },
      { $set: { status: 'active' } }
    )

    // Auto-fill images (and descriptions where possible) for just-approved venues.
    const approved = await Venue.find({ _id: { $in: venueIds }, status: 'active' }).lean()
    let enriched = 0
    await Promise.allSettled(approved.map(async v => {
      const updates = await enrichApprovedVenue(v)
      if (Object.keys(updates).length) enriched++
    }))

    res.json({ modified: result.modifiedCount, enriched })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function rejectScrapedVenues(req, res) {
  try {
    const { venueIds } = req.body
    if (!isValidObjectIdArray(venueIds)) {
      return res.status(400).json({ message: 'venueIds must be a non-empty array of valid IDs.' })
    }

    const venues = await Venue.find({ _id: { $in: venueIds }, status: 'scraped' }).lean()
    for (const v of venues) {
      try {
        await rememberRejection('venue', { name: v.name, city: v.city, source: v.source })
      } catch (err) {
        console.warn(`[venues] could not skip-list "${v.name}": ${err.message}`)
      }
    }

    const result = await Venue.deleteMany({ _id: { $in: venueIds }, status: 'scraped' })

    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function bulkDeleteVenues(req, res) {
  try {
    const { venueIds } = req.body
    if (!isValidObjectIdArray(venueIds)) {
      return res.status(400).json({ message: 'venueIds must be a non-empty array of valid IDs.' })
    }

    // Skip-list bot-sourced venues so they don't re-import on the next run.
    const venues = await Venue.find({ _id: { $in: venueIds } }).lean()
    for (const v of venues) {
      if (v.source && v.source !== 'manual') {
        try {
          await rememberRejection('venue', { name: v.name, city: v.city, source: v.source })
        } catch (err) {
          console.warn(`[venues] could not skip-list "${v.name}": ${err.message}`)
        }
      }
    }

    const result = await Venue.deleteMany({ _id: { $in: venueIds } })

    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = {
  lookupVenueImage,
  batchEnrichVenues,
  listVenues,
  getVenuesByCity,
  getVenuesByVibe,
  getUpcomingVenuesByCity,
  createVenue,
  updateVenue,
  deleteVenue,
  runVenueScraper,
  acceptScrapedVenues,
  rejectScrapedVenues,
  bulkDeleteVenues,
}
