const mongoose = require('mongoose')
const Event = require('../models/Event')
const Venue = require('../models/Venue')
const RunLog = require('../models/RunLog')

const startTime = Date.now()

async function getHealth(req, res) {
  try {
    const dbState = mongoose.connection.readyState
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'

    const lastRun = await RunLog.findOne({})
      .sort({ createdAt: -1 })
      .select('status source error trigger createdAt')
      .lean()

    const eventCount = await Event.countDocuments()
    const venueCount = await Venue.countDocuments()

    res.json({
      database: dbStatus,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      lastScraperRun: lastRun?.createdAt || null,
      lastScraperSource: lastRun?.source || null,
      lastScraperStatus: lastRun?.status || null,
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

async function getAdminEmails(req, res) {
  try {
    const emails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    res.json(emails.map((email, i) => ({
      email,
      role: i === 0 ? 'Owner' : 'Admin',
    })))
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { getHealth, getAdminEmails }
