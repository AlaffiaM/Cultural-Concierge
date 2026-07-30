const express = require('express')
const router = express.Router()
const Email = require('../models/Email')
const { isValidEmail } = require('../utils/sanitize')

router.post('/', async (req, res) => {
  try {
    const { email, name, source } = req.body
    if (!email || !isValidEmail(email)) return res.status(400).json({ message: 'A valid email is required' })
    const existing = await Email.findOne({ email: email.toLowerCase().trim() })
    if (existing) return res.json({ message: 'Already subscribed', subscribed: true })
    await Email.create({ email: email.toLowerCase().trim(), name: name || '', source: source || 'newsletter' })
    res.status(201).json({ message: 'Subscribed', subscribed: true })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

module.exports = router
