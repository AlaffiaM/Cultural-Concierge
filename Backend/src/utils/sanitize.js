// Escapes regex metacharacters so user input can't inject into $regex queries.
function escapeRegex(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function isValidIsoDate(value) {
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/i)
  if (!match) return false

  const [, year, month, day] = match
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  if (Number.isNaN(calendarDate.getTime())) return false
  if (calendarDate.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return false
  return !Number.isNaN(new Date(value).getTime())
}

function validateTextFields(data, fields, errors) {
  for (const [field, maxLength] of Object.entries(fields)) {
    const value = data[field]
    if (value === undefined || value === null) continue
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string.`)
      continue
    }
    if (value.trim().length > maxLength) {
      errors.push(`${field} must be ${maxLength} characters or fewer.`)
    }
  }
}

function validateCoordinates(coordinates, errors, required = false) {
  if (coordinates === undefined && !required) return
  if (!coordinates || typeof coordinates !== 'object' || Array.isArray(coordinates)) {
    errors.push('Coordinates must be an object with lat and lng values.')
    return
  }

  const values = ['lat', 'lng'].map(key => coordinates[key])
  const numbers = values.map(value => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
      return Number(value)
    }
    return NaN
  })
  if (!numbers.every(Number.isFinite) || numbers[0] < -90 || numbers[0] > 90 || numbers[1] < -180 || numbers[1] > 180) {
    errors.push('Coordinates must contain latitude (-90 to 90) and longitude (-180 to 180).')
  }
}

function parsePagination(query, defaultLimit, maxLimit) {
  const parseValue = (value, fallback, maximum) => {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null
  }

  const page = parseValue(query.page, 1, 10000)
  const limit = parseValue(query.limit, defaultLimit, maxLimit)
  if (page === null || limit === null) return null
  return { page, limit, skip: (page - 1) * limit }
}

function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
}

function isValidObjectIdArray(values) {
  return Array.isArray(values) && values.length > 0 && values.every(isValidObjectId)
}

function validateEventPayload(payload, { partial = false } = {}) {
  const data = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  const errors = []
  const allowedStatuses = ['draft', 'approved']
  const allowedPillars = ['CULTURE', 'WELLNESS', 'SOCIAL']
  const textFields = {
    name: 120, city: 120, time: 80, type: 60, vibe: 120, description: 3000,
    tip: 1000, imageUrl: 1000, url: 1000, venue: 160, price: 80, source: 80,
  }

  if (!partial) {
    for (const field of ['name', 'city', 'date']) {
      if (data[field] === undefined || data[field] === null ||
          (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field[0].toUpperCase()}${field.slice(1)} is required.`)
      }
    }
  }

  validateTextFields(data, textFields, errors)

  for (const field of ['date', 'endDate']) {
    if (data[field] !== undefined && data[field] !== null && !isValidIsoDate(data[field])) {
      errors.push(`${field === 'date' ? 'Date' : 'End date'} must be a valid ISO date or datetime.`)
    }
  }

  if (data.url !== undefined && data.url !== null && data.url !== '') {
    if (!isValidHttpUrl(data.url)) errors.push('Event URL must be a valid HTTP or HTTPS URL.')
  }
  if (data.imageUrl !== undefined && data.imageUrl !== null && data.imageUrl !== '') {
    if (!isValidHttpUrl(data.imageUrl)) errors.push('Image URL must be a valid HTTP or HTTPS URL.')
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
      const invalid = data.tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 50)
      if (invalid) errors.push('Each tag must be a string of 50 characters or fewer.')
      if (data.tags.length > 25) errors.push('Tags can contain up to 25 entries.')
    }
  }

  if (data.coordinates !== undefined || !partial) {
    validateCoordinates(data.coordinates, errors, !partial)
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (typeof value === 'string') sanitized[key] = value.trim()
    else if (Array.isArray(value)) sanitized[key] = value.map((item) => (typeof item === 'string' ? item.trim() : item))
    else sanitized[key] = value
  }
  if (sanitized.coordinates && typeof sanitized.coordinates === 'object' && !Array.isArray(sanitized.coordinates)) {
    sanitized.coordinates = { lat: Number(sanitized.coordinates.lat), lng: Number(sanitized.coordinates.lng) }
  }

  if (data.date && data.endDate && isValidIsoDate(data.date) && isValidIsoDate(data.endDate) &&
      new Date(data.endDate) < new Date(data.date)) {
    errors.push('End date cannot be earlier than the event date.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  }
}

function validateVenuePayload(payload, { partial = false } = {}) {
  const data = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  const errors = []
  const textFields = {
    name: 120, city: 120, type: 80, description: 3000, tip: 1000, address: 240, source: 80,
  }

  if (!partial) {
    for (const field of ['name', 'city']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) {
        errors.push(`${field[0].toUpperCase()}${field.slice(1)} is required.`)
      }
    }
  }
  validateTextFields(data, textFields, errors)

  for (const field of ['tags', 'vibeTags', 'images']) {
    if (data[field] === undefined) continue
    const values = data[field]
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) {
      errors.push(`${field} must be an array of strings.`)
      continue
    }
    const maxItems = field === 'images' ? 10 : 25
    if (values.length > maxItems || values.some(value => value.trim().length > 1000)) {
      errors.push(`${field} contains too many entries or an entry that is too long.`)
    }
    if (field === 'images' && values.some(value => value.trim() && !isValidHttpUrl(value))) {
      errors.push('Each image must be a valid HTTP or HTTPS URL.')
    }
  }

  if (data.pillar !== undefined && data.pillar !== null && data.pillar !== '' &&
      !['CULTURE', 'WELLNESS', 'SOCIAL'].includes(data.pillar)) {
    errors.push('Pillar must be CULTURE, WELLNESS, or SOCIAL.')
  }
  if (data.status !== undefined && data.status !== null && data.status !== '' &&
      !['scraped', 'active', 'inactive'].includes(data.status)) {
    errors.push('Status must be scraped, active, or inactive.')
  }
  if (data.coordinates !== undefined && data.coordinates !== null) {
    validateCoordinates(data.coordinates, errors)
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (typeof value === 'string') sanitized[key] = value.trim()
    else if (Array.isArray(value)) sanitized[key] = value.map(item => typeof item === 'string' ? item.trim() : item)
    else sanitized[key] = value
  }
  if (sanitized.coordinates && typeof sanitized.coordinates === 'object' && !Array.isArray(sanitized.coordinates)) {
    sanitized.coordinates = { lat: Number(sanitized.coordinates.lat), lng: Number(sanitized.coordinates.lng) }
  }

  return { isValid: errors.length === 0, errors, sanitized }
}

module.exports = { escapeRegex, isValidEmail, isValidHttpUrl, isValidIsoDate, isValidObjectId, isValidObjectIdArray, parsePagination, validateEventPayload, validateVenuePayload }
