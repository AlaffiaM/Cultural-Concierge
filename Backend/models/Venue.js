const mongoose = require('mongoose')

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  type: String,
  pillar: { type: String, enum: ['CULTURE', 'WELLNESS', 'SOCIAL'] },
  vibeTags: [String],
  tags: [String],
  description: String,
  tip: String,
  address: String,
  images: [String],
  coordinates: {
    lat: Number,
    lng: Number,
  },
  source: { type: String, default: 'manual' },
  status: { type: String, enum: ['scraped', 'active', 'inactive'], default: 'active' },
}, { timestamps: true, collection: 'spots' })

venueSchema.index({ status: 1, city: 1 })

module.exports = mongoose.model('Venue', venueSchema)
