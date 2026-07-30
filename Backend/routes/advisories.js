const express = require('express')
const router = express.Router()
const CityAdvisory = require('../models/CityAdvisory')
const { requireAdmin } = require('../middleware/admin')
const { refreshAdvisories } = require('../utils/travelBriefUpdater')

function applyNightTravelOverride(advisory) {
  if (!advisory || !advisory.security) return advisory
  const guidelines = advisory.security.operational_guidelines
  if (!guidelines) return advisory
  for (const g of guidelines) {
    if (g.category === 'Night Travel') {
      g.instruction = 'Avoid all non-essential night travel. Use armored vehicles if possible.'
    }
  }
  return advisory
}

// GET /api/advisories/:city — public, returns advisory for a city
router.get('/:city', async (req, res) => {
  try {
    const query = req.params.city
    const advisory = await CityAdvisory.findOne({
      $or: [
        { city_id: { $regex: `^${query}$`, $options: 'i' } },
        { city_name: { $regex: `^${query}$`, $options: 'i' } },
      ]
    })
    res.json(applyNightTravelOverride(advisory) || null)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/advisories/refresh — admin-only, triggers Gemini update
router.post('/refresh', requireAdmin, async (req, res) => {
  try {
    const result = await refreshAdvisories()
    res.json(result)
  } catch (err) {
    console.error('[advisories] Refresh error:', err)
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
