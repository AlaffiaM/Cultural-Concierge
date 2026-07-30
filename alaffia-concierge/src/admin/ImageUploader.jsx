import { useState, useRef } from 'react'
import { getClerkToken } from '../lib/clerk'

export default function ImageUploader({ onUploaded, label = 'Upload Image' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const token = await getClerkToken()

      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Upload failed: ${res.status}`)
      }

      const data = await res.json()
      onUploaded(data.url)
    } catch (err) {
      console.error('[ImageUploader]', err.message)
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        {uploading ? 'Uploading...' : label}
      </button>
      {error && <p style={{ color: '#e74c3c', fontSize: 11, margin: '4px 0 0' }}>{error}</p>}
    </div>
  )
}
