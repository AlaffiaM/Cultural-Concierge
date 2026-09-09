// One-time cleanup: re-runs every draft (pending-approval) event through the
// current feed-quality rules and deletes the ones that now fail. Approved
// events are never touched.
//
// Run manually from anywhere:
//   node Backend/src/scripts/cleanupStalePending.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const mongoose = require('mongoose')
const Event = require('../models/Event')
const { isBanned, matchesCoreVibe } = require('../utils/eventClassifier')

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')

  const drafts = await Event.find({ status: 'draft' }).lean()
  console.log(`Draft events found: ${drafts.length}`)

  let deleted = 0
  for (const ev of drafts) {
    const banned = isBanned(ev.name, ev.description)
    const vibe = matchesCoreVibe(ev.name, ev.description)
    if (!banned && vibe) continue

    const reason = banned ? 'banned' : 'no vibe'
    await Event.deleteOne({ _id: ev._id })
    deleted++
    console.log(`[cleanup-stale] DELETED (${reason}): "${ev.name}" | city=${ev.city} | source=${ev.source || 'manual'}`)
  }

  console.log('--- Summary ---')
  console.log(`Draft events checked: ${drafts.length}`)
  console.log(`Deleted: ${deleted}`)
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[cleanup-stale] Failed:', err.message)
    process.exit(1)
  })
