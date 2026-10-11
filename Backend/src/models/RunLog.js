const mongoose = require('mongoose')

const runLogSchema = new mongoose.Schema({
  source: { type: String, required: true },
  trigger: { type: String, enum: ['manual', 'scheduled'], default: 'manual' },
  status: { type: String, enum: ['ok', 'skipped', 'error'], default: 'ok' },
  fetched: { type: Number, default: 0 },
  new: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  rejected: { type: Number, default: 0 },
  past: { type: Number, default: 0 },
  blocked: { type: Number, default: 0 },
  error: String,
  startedAt: Date,
  finishedAt: Date,
}, { timestamps: true })

runLogSchema.index({ source: 1, createdAt: -1 })
runLogSchema.index({ trigger: 1, createdAt: -1 })

module.exports = mongoose.model('RunLog', runLogSchema)