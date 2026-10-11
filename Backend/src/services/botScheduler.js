// Turnkey automation: schedules event + venue ingestion via node-cron and
// runs once on boot so a container restart always refreshes data.
const cron = require('node-cron')
const RunLog = require('../models/RunLog')
const { executeSources } = require('./botService')
const { ingestScrapedVenues } = require('./venueService')

const EVENT_SOURCES = ['eventbrite', 'kenyabuzz', 'mookh', 'tixafrica']
const VENUE_SOURCES = ['gemini', 'wikipedia']

async function runVenuesScheduled(trigger = 'scheduled') {
  const startedAt = new Date()
  for (const source of VENUE_SOURCES) {
    try {
      const res = await ingestScrapedVenues(source)
      console.log(`[bot] venues-${source}: ${res.new} new, ${res.skipped} skipped, ${res.blocked} blocked`)
      await RunLog.create({
        source: `venues-${source}`,
        trigger,
        status: 'ok',
        fetched: res.fetched,
        new: res.new,
        skipped: res.skipped,
        blocked: res.blocked,
        startedAt,
        finishedAt: new Date(),
      })
    } catch (err) {
      console.error(`[bot] venues-${source} failed:`, err.message)
      await RunLog.create({
        source: `venues-${source}`,
        trigger,
        status: 'error',
        error: err.message,
        startedAt,
        finishedAt: new Date(),
      })
    }
  }
}

function startBotScheduler() {
  const timezone = process.env.BOT_TIMEZONE || 'Africa/Nairobi'
  const eventSchedule = process.env.BOT_SCHEDULE || '0 0,18 * * *'
  const venueSchedule = process.env.VENUE_BOT_SCHEDULE || '0 0,18 * * *'

  if (cron.validate(eventSchedule)) {
    cron.schedule(eventSchedule, () => {
      console.log('[bot] scheduled events run starting')
      executeSources(EVENT_SOURCES, 'scheduled')
        .then(r => console.log(`[bot] events run complete: ${r.total || 0} new`))
        .catch(err => console.error('[bot] scheduled events run failed:', err.message))
    }, { timezone })
    console.log(`[bot] events scheduler active: ${eventSchedule} (${timezone})`)
  } else {
    console.warn(`[bot] invalid BOT_SCHEDULE "${eventSchedule}" — events scheduler disabled`)
  }

  if (cron.validate(venueSchedule)) {
    cron.schedule(venueSchedule, () => {
      console.log('[bot] scheduled venues run starting')
      runVenuesScheduled().catch(err => console.error('[bot] scheduled venues run failed:', err.message))
    }, { timezone })
    console.log(`[bot] venues scheduler active: ${venueSchedule} (${timezone})`)
  } else {
    console.warn(`[bot] invalid VENUE_BOT_SCHEDULE "${venueSchedule}" — venues scheduler disabled`)
  }

  // Initial refresh shortly after boot (15s, after the DB settles).
  setTimeout(() => {
    executeSources(EVENT_SOURCES, 'scheduled')
      .then(r => console.log(`[bot] boot run complete: ${r.total || 0} new events`))
      .catch(err => console.error('[bot] boot run failed:', err.message))
    runVenuesScheduled().catch(err => console.error('[bot] boot venue run failed:', err.message))
  }, 15000)
}

module.exports = { startBotScheduler, runVenuesScheduled }