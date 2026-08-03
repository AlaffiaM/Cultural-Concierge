const CityAdvisory = require('../models/CityAdvisory')
const { escapeRegex } = require('../utils/sanitize')

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

async function getAdvisoryByCity(req, res) {
  try {
    const query = escapeRegex(req.params.city)
    const advisory = await CityAdvisory.findOne({
      $or: [
        { city_id: { $regex: `^${query}$`, $options: 'i' } },
        { city_name: { $regex: `^${query}$`, $options: 'i' } },
      ]
    })
    res.json(applyNightTravelOverride(advisory) || null)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function runAdvisoryScraper(req, res) {
  try {
    const scraper = require('../scrapers/advisors-gemini')
    const result = await scraper.scrape()
    res.json(result)
  } catch (err) {
    console.error('[advisories] scraper error:', err.message)
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getAdvisoryByCity, runAdvisoryScraper }
