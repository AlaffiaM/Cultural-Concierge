const { verifyToken } = require('@clerk/backend')

async function verifyClerkToken(token) {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    return {
      uid: payload.sub,
      email: payload.email,
      email_verified: true,
    }
  } catch (err) {
    console.error('[verifyToken] Clerk verify failed:', err)
    throw err
  }
}

module.exports = { verifyClerkToken }
