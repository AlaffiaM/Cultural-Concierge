// Brevo (ex-Sendinblue) client: transactional email + contact/list sync.
// Auth: `api-key: xkeysib-...` header on api.brevo.com/v3.
const axios = require('axios')

const API_BASE = 'https://api.brevo.com/v3'

function getConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
    senderName: process.env.BREVO_SENDER_NAME || 'Culture Concierge',
    listId: process.env.BREVO_LIST_ID || '',
  }
}

function hasBrevo() {
  const { apiKey, senderEmail } = getConfig()
  return !!apiKey && !!senderEmail
}

function client() {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'api-key': getConfig().apiKey, 'content-type': 'application/json', accept: 'application/json' },
    timeout: 15000,
  })
}

function toRecipients(recipients) {
  const raw = Array.isArray(recipients) ? recipients : [recipients]
  return raw.filter(Boolean).map(email => ({ email }))
}

// Sends a transactional email. `text`/`html` optional but at least one required.
async function sendTransactional({ to, subject, text, html }) {
  if (!hasBrevo()) {
    console.warn('[brevo] not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL) — email not sent')
    return { sent: false, reason: 'no-config' }
  }
  const { senderEmail, senderName } = getConfig()
  const body = {
    sender: { name: senderName, email: senderEmail },
    to: toRecipients(to),
    subject,
  }
  if (text) body.textContent = text
  if (html) body.htmlContent = html

  try {
    const { data } = await client().post('/smtp/email', body)
    return { sent: true, messageId: data.messageId }
  } catch (err) {
    const detail = err.response?.data?.message || err.message
    console.error(`[brevo] transactional email failed: ${detail}`)
    return { sent: false, reason: 'error', error: detail }
  }
}

// Upserts a contact and adds it to the configured list (fire-and-forget, fail-open).
async function addContact(email, name) {
  if (!getConfig().apiKey) {
    return { synced: false, reason: 'no-api-key' }
  }
  const body = { email, updateEnabled: true }
  if (name) body.attributes = { NOM: String(name).slice(0, 100) }
  if (getConfig().listId) body.listIds = [parseInt(getConfig().listId, 10)]

  try {
    await client().post('/contacts', body)
    return { synced: true }
  } catch (err) {
    // 400 with "Contact already exist" can still mean list membership changed — ignore user errors.
    const detail = err.response?.data?.message || err.message
    console.warn(`[brevo] contact sync failed for "${email}": ${detail}`)
    return { synced: false, reason: 'error' }
  }
}

module.exports = { sendTransactional, addContact, hasBrevo }