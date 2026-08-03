const { verifyClerkToken } = require('../services/clerkService')

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await verifyClerkToken(token)
    const { email, uid } = decoded
    req.authUser = { email: (email || '').toLowerCase(), uid }
    next()
  } catch (err) {
    console.error('[auth] Token error:', err.code || err.name, err.message)
    return res.status(401).json({ message: err.message || 'Invalid token' })
  }
}

module.exports = { requireAuth }
