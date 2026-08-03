const { requireAuth } = require('./auth')

// Admin guard: requires a valid Clerk session AND an email in ADMIN_EMAILS.
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    if (!adminEmails.includes(req.authUser.email)) {
      return res.status(403).json({ message: 'Access denied. Not an admin.' })
    }
    req.adminUser = { email: req.authUser.email, uid: req.authUser.uid }
    next()
  })
}

module.exports = { requireAdmin }
