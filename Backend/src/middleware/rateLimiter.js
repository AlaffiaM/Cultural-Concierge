const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

// Public newsletter signup: strict per-IP limit to stop spam bots.
// Factory so tests can create a fresh instance (singleton below used by the app).
const createSubscribeLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many subscription attempts. Try again later.' },
})

const subscribeLimiter = createSubscribeLimiter()

module.exports = { apiLimiter, subscribeLimiter, createSubscribeLimiter }
