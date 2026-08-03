import { useState } from 'react'
import { useToast } from './Toast'
import { API_BASE } from '../lib/api'

export default function AdminAdvisories() {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  async function handleRefresh() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/advisories/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await window.Clerk?.session?.getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Refresh failed')
      addToast(`Advisories refreshed — ${data.updated} cities updated (${data.cities?.join(', ')})`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to refresh advisories', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-advisories">
      <div className="admin-card">
        <h3>Travel Advisories</h3>
        <p>Generate travel advisories for Nairobi, Lagos, Abuja, and Kigali using Gemini AI.</p>
        <button className="admin-btn admin-btn-primary" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Advisories'}
        </button>
      </div>
    </div>
  )
}
