const express = require('express')
const router = express.Router()
const Email = require('../models/Email')

router.post('/', async (req, res) => {
  try {
    const { email, name, source } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })
    const existing = await Email.findOne({ email: email.toLowerCase().trim() })
    if (existing) return res.json({ message: 'Already subscribed', subscribed: true })
    await Email.create({ email, name: name || '', source: source || 'newsletter' })
    res.status(201).json({ message: 'Subscribed', subscribed: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
