const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  linkedSpotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  date: { type: Date, required: true },
  endDate: Date,
  time: String,
  type: String,
  pillar: { type: String, enum: ['CULTURE', 'WELLNESS', 'SOCIAL'] },
  tags: [String],
  vibe: String,
  description: String,
  tip: String,
  imageUrl: String,
  venue: String,
  price: String,
  status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
  isGhostLocation: { type: Boolean, default: false },
  source: { type: String, default: 'manual' },
}, { timestamps: true })

eventSchema.index(
  { name: 1, city: 1, date: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
)

module.exports = mongoose.model('Event', eventSchema)
