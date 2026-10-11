const mongoose = require('mongoose')

// User-controlled "skip list". Terms stored here are filtered out of the
// ingestion pipeline (scope: event | venue) so unwanted items never re-import.
const blocklistSchema = new mongoose.Schema({
  scope: { type: String, enum: ['event', 'venue'], required: true },
  term: { type: String, required: true },
  city: { type: String, default: '' },
  source: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true })

blocklistSchema.index({ scope: 1, term: 1, city: 1 }, { unique: true })
blocklistSchema.index({ scope: 1 })

module.exports = mongoose.model('Blocklist', blocklistSchema)