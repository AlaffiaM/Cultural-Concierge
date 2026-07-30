const { clerkClient } = require('@clerk/clerk-sdk-node')

async function verifyClerkToken(token) {
  try {
    const payload = await clerkClient.verifyToken(token)
    const user = await clerkClient.users.getUser(payload.sub)
    const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)
    const email = primaryEmail?.emailAddress || user.emailAddresses?.[0]?.emailAddress
    if (!email) {
      throw { code: 'auth/no-email', message: 'No email associated with account' }
    }
    return { email, email_verified: true, uid: payload.sub }
  } catch (err) {
    console.error('[verifyToken] Clerk verify failed:', err.message)
    throw err
  }
}

module.exports = { verifyClerkToken }