const { verifyClerkToken } = require('./verifyToken')

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await verifyClerkToken(token)
    const { email, uid } = decoded
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ message: 'Access denied. Not an admin.' })
    }
    req.adminUser = { email: email.toLowerCase(), uid }
    next()
  } catch (err) {
    console.error('[admin] Auth error:', err.code || err.name, err.message)
    return res.status(401).json({ message: err.message || 'Invalid token' })
  }
}

module.exports = { requireAdmin }
