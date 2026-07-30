const mongoose = require('mongoose')

const emailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  source: { type: String, enum: ['signin', 'newsletter'], default: 'signin' },
}, { timestamps: true })

module.exports = mongoose.model('Email', emailSchema)
