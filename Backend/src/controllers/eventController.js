// Event endpoints. `status`: draft = scraped awaiting approval, approved = live.
const Event = require('../models/Event')
const { escapeRegex } = require('../utils/sanitize')

const EVENT_ALLOWED_UPDATES = ['name', 'city', 'coordinates', 'linkedSpotId', 'date', 'endDate', 'time', 'type', 'pillar', 'tags', 'vibe', 'description', 'tip', 'imageUrl', 'venue', 'price', 'status', 'isGhostLocation']
const GHOST_VALID_STATUSES = ['draft', 'approved']

function scoreEvent(ev) {
  let s = 0
  if (ev.description) s++
  if (ev.imageUrl) s++
  if (ev.venue) s++
  if (ev.price) s++
  if (ev.pillar) s++
  if (ev.vibe) s++
  if (ev.tip) s++
  if (ev.time) s++
  if (ev.endDate) s++
  if (ev.linkedSpotId) s += 2
  return s
}

function normalizeNameFuzzy(name) {
  let n = name.toLowerCase()
  // Strip trailing date patterns: "31st July", "31 July", "July 31", "July 31st"
  n = n.replace(/\b\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '')
  n = n.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/g, '')
  // Strip year patterns: "2026", "2026/27", "2026-27"
  n = n.replace(/\b20\d{2}(?:\/\d{2,4}|-\d{2,4})?\b/g, '')
  // Strip edition/volume labels: "Edition 3", "Volume 2", "Series 4"
  n = n.replace(/\b(edition|volume|vol|series|episode)\s*\d*\b/gi, '')
  // Strip parenthetical qualifiers: "(Nairobi)", "(August)", "(2026)"
  n = n.replace(/\([^)]*\)/g, '')
  return n.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function fuzzyMatch(nameA, nameB) {
  const a = normalizeNameFuzzy(nameA)
  const b = normalizeNameFuzzy(nameB)
  if (!a || !b) return false
  return a === b || a.startsWith(b) || b.startsWith(a)
}

async function listEvents(req, res) {
  try {
    const filter = {}
    if (req.query.all !== 'true') {
      filter.status = 'approved'
    }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }
    if (req.query.ghost === 'true') {
      filter.isGhostLocation = true
    } else if (req.query.ghost === 'false') {
      filter.isGhostLocation = { $ne: true }
    }
    if (req.query.pillar) {
      filter.pillar = { $regex: `^${escapeRegex(req.query.pillar)}$`, $options: 'i' }
    }
    if (req.query.search) {
      const re = { $regex: escapeRegex(req.query.search), $options: 'i' }
      filter.$or = [{ name: re }, { venue: re }, { city: re }]
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)
    const skip = (page - 1) * limit

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit).populate('linkedSpotId', 'name type'),
      Event.countDocuments(filter),
    ])

    res.json({ events, total, page, totalPages: Math.ceil(total / limit) || 1 })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getUpcoming(req, res) {
  try {
    const now = new Date()
    const dateFilter = { $gte: req.query.startDate ? new Date(req.query.startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.$lte = end
    }
    const filter = {
      status: 'approved',
      date: dateFilter,
    }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }
    const events = await Event.find(filter).sort({ date: 1 }).limit(200).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getGhosts(req, res) {
  try {
    const filter = { isGhostLocation: true }
    if (req.query.status && req.query.status !== 'all' && GHOST_VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }
    const events = await Event.find(filter).sort({ date: -1 }).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getPending(req, res) {
  try {
    const filter = { status: 'draft' }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }
    if (req.query.ghost === 'true') filter.isGhostLocation = true
    else if (req.query.ghost === 'false') filter.isGhostLocation = { $ne: true }
    const events = await Event.find(filter).sort({ createdAt: -1 }).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getToday(req, res) {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const filter = {
      status: 'approved',
      date: { $gte: start, $lte: end },
    }
    if (req.query.city) {
      filter.city = { $regex: escapeRegex(req.query.city), $options: 'i' }
    }
    const events = await Event.find(filter).populate('linkedSpotId', 'name type')
    res.json(events)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate('linkedSpotId', 'name type details')
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function createEvent(req, res) {
  try {
    const normalizedDate = req.body.date ? new Date(new Date(req.body.date).toISOString().slice(0, 10)) : undefined
    const existing = await Event.findOne({
      name: req.body.name,
      city: req.body.city,
      date: normalizedDate,
    }).collation({ locale: 'en', strength: 2 })
    if (existing) {
      return res.status(409).json({ message: 'Event already exists', existingId: existing._id })
    }
    const event = new Event({
      name: req.body.name,
      city: req.body.city,
      coordinates: req.body.coordinates,
      linkedSpotId: req.body.linkedSpotId || null,
      date: normalizedDate,
      endDate: req.body.endDate,
      time: req.body.time,
      type: req.body.type,
      pillar: req.body.pillar,
      tags: req.body.tags || [],
      vibe: req.body.vibe,
      description: req.body.description,
      tip: req.body.tip,
      imageUrl: req.body.imageUrl,
      isGhostLocation: req.body.isGhostLocation || false,
      source: req.body.source || 'manual',
      status: 'approved',
    })
    const saved = await event.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function updateEvent(req, res) {
  try {
    const updates = {}
    for (const key of EVENT_ALLOWED_UPDATES) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function approveEvent(req, res) {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { returnDocument: 'after' }
    )
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function deduplicateEvents(req, res) {
  try {
    const mode = req.query.mode || 'all'
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const all = await Event.find(filter).sort({ date: -1 }).lean()
    let removed = 0
    const dupes = []
    let deletedIds = new Set()

    async function dedupGroup(g, label) {
      if (g.length < 2) return
      g = g.filter(e => !deletedIds.has(String(e._id)))
      if (g.length < 2) return
      g.sort((a, b) => scoreEvent(b) - scoreEvent(a))
      const ids = g.slice(1).map(e => e._id)
      ids.forEach(id => deletedIds.add(String(id)))
      const r = await Event.deleteMany({ _id: { $in: ids } })
      if (r.deletedCount > 0) {
        dupes.push({ name: g[0].name, city: g[0].city, date: g[0].date, removed: r.deletedCount, type: label })
        removed += r.deletedCount
      }
    }

    function fuzzyGroup(events, includeCity) {
      const groups = []
      for (const ev of events) {
        if (deletedIds.has(String(ev._id))) continue
        const norm = normalizeNameFuzzy(ev.name)
        if (!norm) continue
        const city = (ev.city || '').toLowerCase().trim()
        const dateStr = ev.date ? new Date(ev.date).toISOString().slice(0, 10) : 'nodate'
        let matched = false
        for (const g of groups) {
          if (fuzzyMatch(g[0].name, ev.name) &&
              g.dateStr === dateStr &&
              (!includeCity || g.city === city)) {
            g.push(ev)
            matched = true
            break
          }
        }
        if (!matched) {
          groups.push([ev])
          groups[groups.length - 1].dateStr = dateStr
          groups[groups.length - 1].city = city
        }
      }
      return groups.filter(g => g.length > 1)
    }

    // Pass 1: exact city match (same fuzzy name + city + date)
    for (const g of fuzzyGroup(all, true)) {
      await dedupGroup(g, 'exact')
    }

    // Pass 2: multi-city (same fuzzy name + date across 2+ cities)
    if (mode === 'multi-city' || mode === 'all') {
      const remaining = all.filter(e => !deletedIds.has(String(e._id)))
      for (const g of fuzzyGroup(remaining, false)) {
        const cities = new Set(g.map(e => (e.city || '').toLowerCase().trim()))
        if (cities.size > 1) {
          await dedupGroup(g, 'multi-city')
        }
      }
    }

    res.json({ mode, duplicatesFound: dupes.length, duplicatesRemoved: removed, groups: dupes })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found' })
    res.json({ message: 'Event deleted' })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = {
  listEvents,
  getUpcoming,
  getGhosts,
  getPending,
  getToday,
  getEventById,
  createEvent,
  updateEvent,
  approveEvent,
  deduplicateEvents,
  deleteEvent,
}
