const mongoose = require('mongoose')
const Event = require('../models/Event')
const Venue = require('../models/Venue')

const startTime = Date.now()

async function getHealth(req, res) {
  try {
    const dbState = mongoose.connection.readyState
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'

    const lastScrapedEvent = await Event.findOne({ source: { $in: ['ticketsasa', 'kenyabuzz', 'mookh', 'eventbrite', 'gemini'] } })
      .sort({ createdAt: -1 })
      .select('createdAt source')
      .lean()

    const eventCount = await Event.countDocuments()
    const venueCount = await Venue.countDocuments()

    res.json({
      database: dbStatus,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      lastScraperRun: lastScrapedEvent?.createdAt || null,
      lastScraperSource: lastScrapedEvent?.source || null,
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      authConfigured: !!process.env.CLERK_SECRET_KEY,
      eventCount,
      venueCount,
      nodeVersion: process.version,
    })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { getHealth }
