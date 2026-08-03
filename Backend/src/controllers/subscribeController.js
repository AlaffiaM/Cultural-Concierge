const { subscribe } = require('../services/emailService')

async function createSubscription(req, res) {
  try {
    const result = await subscribe(req.body.email, req.body.name, req.body.source)
    res.status(result.created ? 201 : 200).json(result)
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ message: err.message })
    }
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { createSubscription }
