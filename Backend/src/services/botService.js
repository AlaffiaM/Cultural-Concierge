// Bot executor: runs the event ingestion pipeline with a concurrency lock,
// records per-source RunLog rows, and emails a summary (when enabled).
const { runScrapers } = require('../scrapers/index')
const RunLog = require('../models/RunLog')
const { sendRunSummary } = require('./emailService')

let running = false

async function executeSources(sources, trigger = 'manual') {
  if (running) {
    return { status: 'busy', message: 'A bot run is already in progress' }
  }

  running = true
  const startedAt = new Date()
  try {
    const result = await runScrapers(sources)
    await recordLogs(result.results, trigger, startedAt)
    if (trigger === 'scheduled') {
      try {
        await sendRunSummary(trigger, result)
      } catch (err) {
        console.error('[bot] summary email failed:', err.message)
      }
    }
    return result
  } finally {
    running = false
  }
}

async function recordLogs(results, trigger, startedAt) {
  const finishedAt = new Date()
  const docs = []
  for (const [source, r] of Object.entries(results || {})) {
    docs.push({
      source,
      trigger,
      status: r.disabled ? 'skipped' : r.error ? 'error' : 'ok',
      fetched: r.fetched || 0,
      new: r.new || 0,
      skipped: r.skipped === true ? 0 : (r.skipped || 0),
      rejected: r.rejected || 0,
      past: r.past || 0,
      blocked: r.blocked || 0,
      error: r.error || '',
      startedAt,
      finishedAt,
    })
  }
  if (docs.length) {
    try {
      await RunLog.insertMany(docs)
    } catch (err) {
      console.error('[bot] failed to record run logs:', err.message)
    }
  }
}

module.exports = { executeSources }