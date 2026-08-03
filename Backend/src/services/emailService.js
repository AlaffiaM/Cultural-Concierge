const Email = require('../models/Email')
const { isValidEmail } = require('../utils/sanitize')

async function subscribe(email, name, source) {
  const rawEmail = typeof email === 'string' ? email.trim() : email
  if (!rawEmail || !isValidEmail(rawEmail)) {
    const err = new Error('A valid email is required')
    err.status = 400
    throw err
  }

  // Normalize + cap inputs so junk can't land in the DB.
  const cleanEmail = rawEmail.toLowerCase()
  const cleanName = (name || '').toString().trim().slice(0, 100)
  const cleanSource = ['signin', 'newsletter'].includes(source) ? source : 'newsletter'

  const existing = await Email.findOne({ email: cleanEmail })
  if (existing) {
    return { message: 'Already subscribed', subscribed: true, created: false }
  }

  await Email.create({ email: cleanEmail, name: cleanName, source: cleanSource })
  return { message: 'Subscribed', subscribed: true, created: true }
}

module.exports = { subscribe }
