// Escapes regex metacharacters so user input can't inject into $regex queries.
function escapeRegex(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return fallback
  }
  return String(value).trim()
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function validateEventPayload(payload, { partial = false } = {}) {
  const data = payload && typeof payload === 'object' ? payload : {}
  const errors = []
  const allowedStatuses = ['draft', 'approved']
  const allowedPillars = ['CULTURE', 'WELLNESS', 'SOCIAL']

  const requireField = (field, message) => {
    if (partial && data[field] === undefined) return
    if (data[field] === undefined || data[field] === null || String(data[field]).trim() === '') {
      errors.push(message)
    }
  }

  if (!partial) {
    requireField('name', 'Name is required.')
    requireField('city', 'City is required.')
    requireField('date', 'Date is required.')
    if (data.coordinates === undefined || data.coordinates === null) {
      errors.push('Coordinates are required.')
    } else {
      if (typeof data.coordinates !== 'object' || Array.isArray(data.coordinates)) {
        errors.push('Coordinates must be an object with lat and lng values.')
      } else {
        const { lat, lng } = data.coordinates
        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
          errors.push('Coordinates must include valid lat and lng numbers.')
        }
      }
    }
  }

  if (data.name !== undefined) {
    const value = normalizeString(data.name)
    if (!value) errors.push('Name cannot be blank.')
    else if (value.length > 120) errors.push('Name must be 120 characters or fewer.')
  }

  if (data.city !== undefined) {
    const value = normalizeString(data.city)
    if (!value) errors.push('City cannot be blank.')
    else if (value.length > 120) errors.push('City must be 120 characters or fewer.')
  }

  if (data.date !== undefined && data.date !== null && data.date !== '') {
    const dateValue = new Date(data.date)
    if (Number.isNaN(dateValue.getTime())) {
      errors.push('Date must be a valid ISO date.')
    }
  }

  if (data.type !== undefined && data.type !== null && String(data.type).trim() !== '') {
    const value = normalizeString(data.type)
    if (value.length > 60) errors.push('Type must be 60 characters or fewer.')
  }

  if (data.url !== undefined && data.url !== null && data.url !== '') {
    if (!isValidHttpUrl(data.url)) errors.push('Event URL must be a valid HTTP or HTTPS URL.')
  }

  if (data.pillar !== undefined && data.pillar !== null && data.pillar !== '') {
    if (!allowedPillars.includes(data.pillar)) {
      errors.push('Pillar must be CULTURE, WELLNESS, or SOCIAL.')
    }
  }

  if (data.status !== undefined && data.status !== null && data.status !== '') {
    if (!allowedStatuses.includes(data.status)) {
      errors.push('Status must be draft or approved.')
    }
  }

  if (data.isGhostLocation !== undefined && typeof data.isGhostLocation !== 'boolean') {
    errors.push('isGhostLocation must be a boolean.')
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array of strings.')
    } else {
      const invalid = data.tags.some((tag) => typeof tag !== 'string')
      if (invalid) errors.push('Each tag must be a string.')
      if (data.tags.length > 25) errors.push('Tags can contain up to 25 entries.')
    }
  }

  if (data.coordinates !== undefined && data.coordinates !== null) {
    if (typeof data.coordinates !== 'object' || Array.isArray(data.coordinates)) {
      errors.push('Coordinates must be an object with lat and lng values.')
    }
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (typeof value === 'string') sanitized[key] = value.trim()
    else if (Array.isArray(value)) sanitized[key] = value.map((item) => (typeof item === 'string' ? item.trim() : item))
    else sanitized[key] = value
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  }
}

module.exports = { escapeRegex, isValidEmail, isValidHttpUrl, validateEventPayload }
