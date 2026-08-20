const Event = require('../models/Event')
const { runScrapers } = require('../services/scraperService')

const SCRAPER_SOURCES = ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite', 'tixafrica']

async function runScraper(req, res) {
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
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getScraperHistory(req, res) {
  try {
    const { source, limit = 50 } = req.query
    const filter = { source: { $in: SCRAPER_SOURCES } }
    if (source) {
      if (!SCRAPER_SOURCES.includes(source)) {
        return res.status(400).json({ message: `Invalid source. Valid: ${SCRAPER_SOURCES.join(', ')}` })
      }
      filter.source = source
    }

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name city date source status createdAt imageUrl pillar venue price description')

    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function approveScrapedEvents(req, res) {
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
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function rejectScrapedEvents(req, res) {
  try {
    const { eventIds } = req.body
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: 'eventIds array is required' })
    }

    const result = await Event.deleteMany({ _id: { $in: eventIds } })

    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { runScraper, getScraperHistory, approveScrapedEvents, rejectScrapedEvents }
