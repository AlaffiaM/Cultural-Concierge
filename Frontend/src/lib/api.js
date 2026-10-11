// In local development, prefer the Vite proxy instead of calling the remote API directly.
// This avoids CORS issues and lets /api requests resolve to localhost:5000.
export const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
