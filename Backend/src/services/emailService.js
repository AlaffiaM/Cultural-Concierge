const Email = require('../models/Email')
const Event = require('../models/Event')
const { isValidEmail } = require('../utils/sanitize')
const { sendTransactional, addContact } = require('./brevoService')

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
    // Already subscribed in-app; make sure they're on the Brevo list too.
    await addContact(cleanEmail, cleanName)
    return { message: 'Already subscribed', subscribed: true, created: false }
  }

  await Email.create({ email: cleanEmail, name: cleanName, source: cleanSource })
  await addContact(cleanEmail, cleanName)
  return { message: 'Subscribed', subscribed: true, created: true }
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(isValidEmail)
}

async function sendRunSummary(trigger, result) {
  if (process.env.BOT_EMAIL_ON !== 'true') return { sent: false, reason: 'disabled' }

  const recipients = adminEmails()
  if (!recipients.length) {
    console.warn('[email] ADMIN_EMAILS empty — run summary not sent')
    return { sent: false, reason: 'no-admins' }
  }

  const lines = Object.entries(result.results || {}).map(([src, r]) => {
    if (r.disabled) return `- ${src}: skipped (not configured)`
    const stats = `${r.new || 0} new · ${r.skipped || 0} duplicate · ${r.rejected || 0} filtered` + (r.blocked ? ` · ${r.blocked} skip-listed` : '')
    return r.error ? `x ${src}: FAILED (${r.error})` : `- ${src}: ${stats}`
  })

  let pendingCount = 0
  try {
    pendingCount = await Event.countDocuments({ status: 'draft' })
  } catch (_) {}

  const text = [
    `Culture Concierge bot run (${trigger})`,
    '',
    ...lines,
    '',
    `Pending approval: ${pendingCount}`,
    'Log in to review: approved events stay hidden until you approve them.',
  ].join('\n')

  return sendTransactional({
    to: recipients,
    subject: `Culture Concierge bot summary — ${new Date().toLocaleString()}`,
    text,
  })
}

module.exports = { subscribe, sendRunSummary }