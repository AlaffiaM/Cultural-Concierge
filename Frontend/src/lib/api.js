// Backend origin. Blank in dev (Vite proxies /api to localhost:5000),
// set to the Render URL in production.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
