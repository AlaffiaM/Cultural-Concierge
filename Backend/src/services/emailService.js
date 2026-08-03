const Email = require('../models/Email')
const { isValidEmail } = require('../utils/sanitize')

async function subscribe(email, name, source) {
  if (!email || !isValidEmail(email)) {
    const err = new Error('A valid email is required')
    err.status = 400
    throw err
  }

  const existing = await Email.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    return { message: 'Already subscribed', subscribed: true, created: false }
  }

  await Email.create({ email: email.toLowerCase().trim(), name: name || '', source: source || 'newsletter' })
  return { message: 'Subscribed', subscribed: true, created: true }
}

module.exports = { subscribe }
