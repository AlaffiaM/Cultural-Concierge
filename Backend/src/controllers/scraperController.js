const Event = require('../models/Event')
const RunLog = require('../models/RunLog')
const { executeSources } = require('../services/botService')
const { rememberRejection } = require('../services/blocklistService')

const SCRAPER_SOURCES = ['eventbrite', 'kenyabuzz', 'mookh', 'tixafrica']

async function runScraper(req, res) {
  try {
    const source = req.body.source
    const sources = source ? [source] : SCRAPER_SOURCES

    const invalid = sources.filter(s => !SCRAPER_SOURCES.includes(s))
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid source(s): ${invalid.join(', ')}. Valid: ${SCRAPER_SOURCES.join(', ')}` })
    }

    const result = await executeSources(sources, 'manual')
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

async function getRunLogs(req, res) {
  try {
    const { limit = 20 } = req.query
    const logs = await RunLog.find({})
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(parseInt(limit) || 20, 1), 100))
    res.json(logs)
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

    const events = await Event.find({ _id: { $in: eventIds } }).lean()
    for (const ev of events) {
      try {
        await rememberRejection('event', { name: ev.name, city: ev.city, source: ev.source })
      } catch (err) {
        console.warn(`[scraper] could not skip-list "${ev.name}": ${err.message}`)
      }
    }

    const result = await Event.deleteMany({ _id: { $in: eventIds } })

    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { runScraper, getScraperHistory, getRunLogs, approveScrapedEvents, rejectScrapedEvents }