const Blocklist = require('../models/Blocklist')

async function getEntries(scope) {
  return Blocklist.find({ scope }).lean()
}

function termMatches(entry, text) {
  const term = (entry.term || '').trim().toLowerCase()
  if (!term) return false
  if (!text) return false
  return text.toLowerCase().includes(term)
}

function cityMatches(entry, city) {
  if (!entry.city || !city) return true
  return entry.city.trim().toLowerCase() === city.trim().toLowerCase()
}

// Synchronous matcher over entries already loaded for a run.
function isBlocked(entries, text, city) {
  return entries.some(e => cityMatches(e, city) && termMatches(e, text))
}

// Remember a rejected/deleted item so it never re-imports.
async function rememberRejection(scope, { name, city, source }) {
  const term = String(name || '').trim()
  if (!term) return null
  return Blocklist.findOneAndUpdate(
    { scope, term, city: city || '' },
    {
      $setOnInsert: {
        scope,
        term,
        city: city || '',
        source: source || '',
        note: 'auto-added on reject/delete',
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
}

async function listBlocks(scope) {
  const filter = scope ? { scope } : {}
  return Blocklist.find(filter).sort({ createdAt: -1 }).lean()
}

async function addBlock({ scope = 'event', term, city = '', source = '', note = '' }) {
  const clean = String(term || '').trim()
  if (!clean) throw new Error('Term is required')
  return Blocklist.findOneAndUpdate(
    { scope, term: clean, city },
    { $set: { source, note } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
}

async function removeBlock(id) {
  return Blocklist.findByIdAndDelete(id)
}

async function clearBlock(scope) {
  const filter = scope ? { scope } : {}
  return Blocklist.deleteMany(filter)
}

module.exports = { getEntries, isBlocked, rememberRejection, listBlocks, addBlock, removeBlock, clearBlock }