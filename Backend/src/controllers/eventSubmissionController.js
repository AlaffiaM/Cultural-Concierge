const Event = require('../models/Event')
const EventSubmission = require('../models/EventSubmission')
const { isValidEmail, isValidHttpUrl } = require('../utils/sanitize')
const multer = require('multer')
const { upload } = require('../utils/imageProcessor')
const { sendTransactional } = require('../services/brevoService')

const CITIES = ['Lagos', 'Abuja', 'Kigali', 'Nairobi']
const PILLARS = ['CULTURE', 'WELLNESS', 'SOCIAL']
const CITY_COORDINATES = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kigali: { lat: -1.9441, lng: 30.0619 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
}
const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (allowed.includes(file.mimetype)) return callback(null, true)
    callback(new Error('Upload a JPG, PNG, WebP, or AVIF image.'))
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

function uploadSubmissionImage(req, res) {
  imageUpload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message })
    if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' })

    try {
      const result = await upload(req.file.buffer, { folder: 'alaffia/community-events' })
      res.json({ url: result.secure_url })
    } catch (uploadError) {
      console.error('[event-submission] image upload failed:', uploadError.message)
      res.status(500).json({ message: 'Image upload failed. You can still submit the event without an image.' })
    }
  })
}

function validateSubmission(data, { partial = false } = {}) {
  const errors = []
  const fields = ['eventName', 'city', 'date', 'time', 'type', 'pillar', 'venue', 'address', 'description', 'price', 'imageUrl', 'url']
  const values = {}

  for (const field of fields) {
    if (partial && data[field] === undefined) continue
    const value = data[field] === undefined || data[field] === null ? '' : data[field]
    if (typeof value !== 'string') {
      errors.push(`${field} must be text.`)
      continue
    }
    values[field] = value.trim()
  }

  const required = ['eventName', 'city', 'date', 'description']
  for (const field of required) {
    if (!values[field]) errors.push(`${field} is required.`)
  }

  if (values.city && !CITIES.includes(values.city)) errors.push('Choose one of the supported cities.')
  if (values.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
      errors.push('Enter the event date in YYYY-MM-DD format.')
    } else {
      const normalized = new Date(`${values.date}T00:00:00.000Z`)
      if (Number.isNaN(normalized.getTime()) || normalized.toISOString().slice(0, 10) !== values.date) {
        errors.push('Enter a valid event date.')
      } else {
        const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
        if (normalized < today) errors.push('Event date must be today or in the future.')
        values.date = normalized
      }
    }
  }
  if (values.eventName && values.eventName.length > 120) errors.push('Event name must be 120 characters or fewer.')
  if (values.time && values.time.length > 80) errors.push('Time must be 80 characters or fewer.')
  if (values.type && values.type.length > 60) errors.push('Event type must be 60 characters or fewer.')
  if (values.venue && values.venue.length > 160) errors.push('Venue must be 160 characters or fewer.')
  if (values.address && values.address.length > 240) errors.push('Address must be 240 characters or fewer.')
  if (values.price && values.price.length > 80) errors.push('Price must be 80 characters or fewer.')
  if (values.imageUrl && values.imageUrl.length > 1000) errors.push('Image link must be 1,000 characters or fewer.')
  if (values.url && values.url.length > 1000) errors.push('Event link must be 1,000 characters or fewer.')
  if (values.pillar && !PILLARS.includes(values.pillar)) errors.push('Choose a valid event category.')
  if (values.description && values.description.length < 10) errors.push('Description must be at least 10 characters.')
  if (values.description && values.description.length > 3000) errors.push('Description must be 3,000 characters or fewer.')
  if (values.url && !isValidHttpUrl(values.url)) errors.push('Booking or event link must be a valid HTTP or HTTPS URL.')
  if (values.imageUrl && !isValidHttpUrl(values.imageUrl)) errors.push('Image link must be a valid HTTP or HTTPS URL.')

  return { errors, values }
}

async function submitEvent(req, res) {
  const { errors, values } = validateSubmission(req.body || {})
  const submitterName = typeof req.body?.submitterName === 'string' ? req.body.submitterName.trim() : ''
  const submitterEmail = typeof req.body?.submitterEmail === 'string' ? req.body.submitterEmail.trim().toLowerCase() : ''

  if (typeof req.body?.submitterName !== 'string' || !submitterName || submitterName.length > 120) errors.push('Enter your name (120 characters or fewer).')
  if (!isValidEmail(submitterEmail)) errors.push('Enter a valid contact email.')
  if (req.body?.consent !== true) errors.push('Confirm that the details are accurate and may be reviewed before publishing.')

  if (errors.length) return res.status(400).json({ message: 'Please check the form.', errors })

  try {
    const pendingDuplicate = await EventSubmission.findOne({
      eventName: { $regex: `^${values.eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      city: values.city,
      date: values.date,
      status: 'pending',
    }).select('_id')
    if (pendingDuplicate) {
      return res.status(409).json({ message: 'This event has already been submitted and is awaiting review.' })
    }

    const duplicate = await Event.findOne({
      name: { $regex: `^${values.eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      city: values.city,
      date: values.date,
    }).select('_id')
    if (duplicate) {
      return res.status(409).json({ message: 'An event with this name, city, and date is already listed.' })
    }

    await EventSubmission.create({
      ...values,
      submitterName,
      submitterEmail,
      status: 'pending',
    })
    await sendTransactional({
      to: submitterEmail,
      subject: 'We received your event submission',
      text: `Hi ${submitterName},\n\nThanks for sharing "${values.eventName}" with Culture Concierge. Our team will review it before it appears in the guide.\n\nWe’ll email you when the review is complete.`,
    })
    return res.status(201).json({
      message: 'Thanks for sharing your event. Our team will review it before it appears publicly.',
    })
  } catch (err) {
    console.error('[event-submission] create failed:', err.message)
    return res.status(500).json({ message: 'Could not submit the event right now. Please try again later.' })
  }
}

async function listSubmissions(req, res) {
  try {
    const filter = req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? { status: req.query.status }
      : { status: 'pending' }
    const submissions = await EventSubmission.find(filter).sort({ createdAt: 1 }).lean()
    res.json(submissions)
  } catch (err) {
    console.error('[event-submission] list failed:', err.message)
    res.status(500).json({ message: 'Could not load event submissions.' })
  }
}

async function approveSubmission(req, res) {
  try {
    const submission = await EventSubmission.findOne({ _id: req.params.id, status: 'pending' })
    if (!submission) return res.status(404).json({ message: 'Pending submission not found.' })

    const { errors, values } = validateSubmission(req.body || {}, { partial: true })
    if (errors.length) return res.status(400).json({ message: 'Please correct the event details.', errors })
    const data = { ...submission.toObject(), ...values }
    const event = await Event.create({
      name: data.eventName,
      city: data.city,
      date: data.date,
      time: data.time || '',
      type: data.type || '',
      pillar: data.pillar || 'CULTURE',
      venue: [data.venue, data.address].filter(Boolean).join(' — '),
      description: data.description,
      price: data.price || '',
      imageUrl: data.imageUrl || '',
      url: data.url || '',
      coordinates: CITY_COORDINATES[data.city],
      status: 'approved',
      source: 'community',
      isGhostLocation: false,
    })

    submission.status = 'approved'
    submission.publishedEventId = event._id
    submission.reviewedEvent = {
      eventName: data.eventName,
      city: data.city,
      date: data.date,
      time: data.time || '',
      type: data.type || '',
      pillar: data.pillar || 'CULTURE',
      venue: data.venue || '',
      address: data.address || '',
      description: data.description,
      price: data.price || '',
      imageUrl: data.imageUrl || '',
      url: data.url || '',
    }
    submission.reviewedAt = new Date()
    await submission.save()
    await sendTransactional({
      to: submission.submitterEmail,
      subject: 'Your event is now live on Culture Concierge',
      text: `Hi ${submission.submitterName},\n\nYour event "${data.eventName}" has been reviewed and published. Thank you for helping the community discover great experiences.`,
    })
    res.json({ message: 'Submission approved and published.', eventId: event._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This event already exists in the published listings.' })
    }
    console.error('[event-submission] approve failed:', err.message)
    res.status(500).json({ message: 'Could not approve the submission.' })
  }
}

async function rejectSubmission(req, res) {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
  if (!reason || reason.length > 500) {
    return res.status(400).json({ message: 'A rejection reason (up to 500 characters) is required.' })
  }

  try {
    const submission = await EventSubmission.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'rejected', rejectionReason: reason, reviewedAt: new Date() } },
      { new: true, runValidators: true }
    )
    if (!submission) return res.status(404).json({ message: 'Pending submission not found.' })
    await sendTransactional({
      to: submission.submitterEmail,
      subject: 'Update on your event submission',
      text: `Hi ${submission.submitterName},\n\nThanks for submitting "${submission.eventName}". We’re unable to publish it at this time.\n\nReview note: ${reason}\n\nThank you for contributing to Culture Concierge.`,
    })
    res.json({ message: 'Submission rejected and the review decision recorded.' })
  } catch (err) {
    console.error('[event-submission] reject failed:', err.message)
    res.status(500).json({ message: 'Could not reject the submission.' })
  }
}

module.exports = { validateSubmission, submitEvent, uploadSubmissionImage, listSubmissions, approveSubmission, rejectSubmission }
