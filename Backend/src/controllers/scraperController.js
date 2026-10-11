const Event = require('../models/Event')
const RunLog = require('../models/RunLog')
const { executeSources } = require('../services/botService')
const { rememberRejection } = require('../services/blocklistService')
const { isValidObjectIdArray, parsePagination } = require('../utils/sanitize')

const SCRAPER_SOURCES = ['eventbrite', 'kenyabuzz', 'mookh', 'tixafrica']

async function runScraper(req, res) {
  try {
    const source = req.body?.source
    if (source !== undefined && typeof source !== 'string') {
      return res.status(400).json({ message: 'source must be a scraper name.' })
    }
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
    const { source } = req.query
    const filter = { source: { $in: SCRAPER_SOURCES } }
    if (source !== undefined && typeof source !== 'string') {
      return res.status(400).json({ message: 'source must be a scraper name.' })
    }
    if (source) {
      if (!SCRAPER_SOURCES.includes(source)) {
        return res.status(400).json({ message: `Invalid source. Valid: ${SCRAPER_SOURCES.join(', ')}` })
      }
      filter.source = source
    }

    const pagination = parsePagination({ limit: req.query.limit }, 50, 200)
    if (!pagination) return res.status(400).json({ message: 'limit must be a positive integer up to 200.' })
    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
      .select('name city date source status createdAt imageUrl pillar venue price description')

    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getRunLogs(req, res) {
  try {
    const pagination = parsePagination({ limit: req.query.limit }, 20, 100)
    if (!pagination) return res.status(400).json({ message: 'limit must be a positive integer up to 100.' })
    const logs = await RunLog.find({})
      .sort({ createdAt: -1 })
      .limit(pagination.limit)
    res.json(logs)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function approveScrapedEvents(req, res) {
  try {
    const { eventIds } = req.body
    if (!isValidObjectIdArray(eventIds)) {
      return res.status(400).json({ message: 'eventIds must be a non-empty array of valid IDs.' })
    }

    const result = await Event.updateMany(
      { _id: { $in: eventIds }, status: 'draft' },
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
    if (!isValidObjectIdArray(eventIds)) {
      return res.status(400).json({ message: 'eventIds must be a non-empty array of valid IDs.' })
    }

    const events = await Event.find({ _id: { $in: eventIds }, status: 'draft' }).lean()
    for (const ev of events) {
      try {
        await rememberRejection('event', { name: ev.name, city: ev.city, source: ev.source })
      } catch (err) {
        console.warn(`[scraper] could not skip-list "${ev.name}": ${err.message}`)
      }
    }

    const result = await Event.deleteMany({ _id: { $in: eventIds }, status: 'draft' })

    res.json({ deleted: result.deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { runScraper, getScraperHistory, getRunLogs, approveScrapedEvents, rejectScrapedEvents }