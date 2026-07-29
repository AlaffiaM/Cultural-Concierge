import { getClerkToken } from '../clerk'

const API_BASE = import.meta.env.VITE_API_URL || ''

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
