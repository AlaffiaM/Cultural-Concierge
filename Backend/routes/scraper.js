const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const Event = require('../models/Event')
const { runScrapers } = require('../scrapers/index')

const SCRAPER_SOURCES = ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite']

// All scraper routes require admin auth
router.use(requireAdmin)

// POST /api/scraper/run — run all or specific scraper
router.post('/run', async (req, res) => {
  try {
    const source = req.body.source
    const sources = source ? [source] : SCRAPER_SOURCES

    const invalid = sources.filter(s => !SCRAPER_SOURCES.includes(s))
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid source(s): ${invalid.join(', ')}. Valid: ${SCRAPER_SOURCES.join(', ')}` })
    }

    const result = await runScrapers(sources)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/scraper/history — recent imported events
router.get('/history', async (req, res) => {
  try {
    const { source, limit = 50 } = req.query
    const filter = { source: { $in: SCRAPER_SOURCES } }
    if (source) filter.source = source

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name city date source status createdAt imageUrl pillar venue price description')

    res.json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/scraper/approve — approve draft events (admin)
router.post('/approve', async (req, res) => {
  try {
    const { eventIds } = req.body
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: 'eventIds array is required' })
    }

    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: { status: 'approved' } }
    )

    res.json({ modified: result.modifiedCount })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
