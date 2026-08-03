// Verifies Clerk JWTs and resolves the user's email.
// JWT may lack an `email` claim, so fall back to the Clerk Users API (cached 5 min).
const { verifyToken, createClerkClient } = require('@clerk/backend')

const emailCache = new Map()
const EMAIL_CACHE_TTL = 5 * 60 * 1000

async function resolveEmail(payload) {
  if (payload.email) return payload.email

  const { sub } = payload
  if (!sub) return null

  const cached = emailCache.get(sub)
  if (cached && Date.now() - cached.at < EMAIL_CACHE_TTL) return cached.email

  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const user = await client.users.getUser(sub)
    const email = user.emailAddresses?.[0]?.emailAddress || null
    emailCache.set(sub, { email, at: Date.now() })
    return email
  } catch (err) {
    console.error('[clerkService] Failed to resolve user email:', err.message)
    return null
  }
}

async function verifyClerkToken(token) {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    const email = await resolveEmail(payload)

    return {
      uid: payload.sub,
      email,
      email_verified: true,
    }
  } catch (err) {
    console.error('[verifyToken] Clerk verify failed:', err)
    throw err
  }
}

module.exports = { verifyClerkToken }
