const mongoose = require('mongoose')

const eventSubmissionSchema = new mongoose.Schema({
  eventName: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, enum: ['Lagos', 'Abuja', 'Kigali', 'Nairobi'] },
  date: { type: Date, required: true },
  time: { type: String, trim: true, maxlength: 80 },
  type: { type: String, trim: true, maxlength: 60 },
  pillar: { type: String, enum: ['CULTURE', 'WELLNESS', 'SOCIAL'], default: 'CULTURE' },
  venue: { type: String, trim: true, maxlength: 160 },
  address: { type: String, trim: true, maxlength: 240 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  price: { type: String, trim: true, maxlength: 80 },
  imageUrl: { type: String, trim: true, maxlength: 1000 },
  url: { type: String, trim: true, maxlength: 1000 },
  frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'none'], default: 'none' },
  submitterName: { type: String, required: true, trim: true, maxlength: 120 },
  submitterEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  publishedEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  reviewedEvent: { type: mongoose.Schema.Types.Mixed, default: null },
  reviewedAt: Date,
}, { timestamps: true })

eventSubmissionSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('EventSubmission', eventSubmissionSchema)
