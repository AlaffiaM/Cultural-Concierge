const mongoose = require('mongoose')

const guidelineSchema = new mongoose.Schema({
  category: String,
  instruction: String,
}, { _id: false })

const outbreakSchema = new mongoose.Schema({
  disease: String,
  risk_level: String,
  advisory_text: String,
}, { _id: false })

const advisorySchema = new mongoose.Schema({
  city_id: { type: String, required: true, unique: true },
  city_name: { type: String, required: true },
  country: String,
  last_updated: String,
  city_overview: String,
  security: {
    security_level_badge: String,
    crime_rating: String,
    operational_guidelines: [guidelineSchema],
  },
  health: {
    health_status_level: String,
    active_outbreaks: [outbreakSchema],
    entry_requirements: {
      mandatory_vaccinations: [String],
      documentation: [String],
    },
  },
}, { timestamps: true })

module.exports = mongoose.model('CityAdvisory', advisorySchema)
