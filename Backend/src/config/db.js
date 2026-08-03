const mongoose = require('mongoose')
const Event = require('../models/Event')

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')
}

function startCleanup() {
  const cleanup = async () => {
    try {
      const { deletedCount } = await Event.deleteMany({ date: { $lt: new Date() } })
      if (deletedCount > 0) console.log(`[cleanup] Deleted ${deletedCount} past event(s)`)
    } catch (err) {
      console.error('[cleanup] Error:', err.message)
    }
  }
  setTimeout(cleanup, 30000)
  setInterval(cleanup, 3600000)
}

module.exports = { connectDB, startCleanup }
