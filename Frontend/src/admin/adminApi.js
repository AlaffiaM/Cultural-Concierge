import { getClerkToken } from '../lib/clerk'
import { API_BASE } from '../lib/api'

// fetch helper for admin routes: attaches the Clerk session token
// and throws the server's error message on non-OK responses.
export async function adminFetch(url, options = {}) {
  const token = await getClerkToken()
  if (!token) {
    throw new Error('Not signed in. Please log in again.')
  }
  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Admin API error: ${res.status}`)
  }
  return res.json()
}
