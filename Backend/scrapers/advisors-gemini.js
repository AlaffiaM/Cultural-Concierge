const axios = require('axios')
const CityAdvisory = require('../models/CityAdvisory')

const SOURCE = 'advisors-gemini'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

async function callGemini(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 16384 } }
      )
      const text = data.candidates[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty Gemini response')
      return text
    } catch (err) {
      if (i < retries && (err.response?.status === 503 || err.response?.status === 429)) {
        const wait = 3000 * (i + 1)
        console.log(`[advisors-gemini] retrying after ${wait}ms (${err.response?.status})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
}

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()) } catch {} }
  const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (arrMatch) { try { return JSON.parse(arrMatch[0]) } catch {} }
  return null
}

const PROMPT = `You are a combined Global Corporate Security Director and Senior Travel Epidemiologist.

Generate a highly structured travel advisory for the following destinations:
1. Nairobi, Kenya
2. Lagos, Nigeria
3. Abuja, Nigeria
4. Kigali, Rwanda

Output Requirements:
1. Respond STRICTLY in a valid JSON array matching the schema below.
2. Do not include any markdown styling, backticks, or code block wrappers. Output raw JSON only.
3. Keep all instruction and advisory_text under 20 words, actionable and direct.
4. Distinguish between general environmental risks and legal/entry requirements.
5. For city_overview, write 2-3 sentences capturing the city's character.

Use these exact city_id values:
  - Nairobi → "NBO-KEN"
  - Lagos → "LOS-NGA"
  - Abuja → "ABV-NGA"
  - Kigali → "KGL-RWA"

Schema:
[
  {
    "city_id": "CODE_FROM_ABOVE",
    "city_name": "CITY_NAME",
    "country": "COUNTRY_NAME",
    "last_updated": "YYYY-MM-DD",
    "city_overview": "OVERVIEW_TEXT",
    "security": {
      "security_level_badge": "ADVISORY_LEVEL_TEXT",
      "crime_rating": "CRIME_SUMMARY_TEXT",
      "operational_guidelines": [
        { "category": "Airport Transit", "instruction": "Free WiFi available at the airport arrivals hall. Connect to book your ride." },
        { "category": "Night Travel", "instruction": "Avoid all non-essential night travel. Use armored vehicles if possible." },
        { "category": "High-Risk Zones", "instruction": "ACTIONABLE_TEXT" }
      ]
    },
    "health": {
      "health_status_level": "HEALTH_SURVEILLANCE_TEXT",
      "active_outbreaks": [
        { "disease": "DISEASE_NAME", "risk_level": "RISK_TEXT", "advisory_text": "ACTIONABLE_TEXT" }
      ],
      "entry_requirements": {
        "mandatory_vaccinations": ["VACCINE_REQUIRED"],
        "documentation": ["FORM_REQUIRED"]
      }
    }
  }
]`

async function scrape() {
  console.log('[advisors-gemini] Generating advisories via Gemini...')
  const raw = await callGemini(PROMPT)
  let cities = extractJSON(raw)
  if (!cities || !Array.isArray(cities)) throw new Error('Gemini response was not an array')

  let updated = 0
  for (const city of cities) {
    if (!city.city_id || !city.city_name) { console.warn('[advisors-gemini] Skipping entry missing city_id/name'); continue }
    await CityAdvisory.findOneAndUpdate({ city_id: city.city_id }, city, { upsert: true, new: true })
    updated++
    console.log(`[advisors-gemini] ${city.city_name} (${city.city_id})`)
  }

  console.log(`[advisors-gemini] Done — ${updated} cities updated`)
  return { updated, cities: cities.map(c => c.city_id) }
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => console.log(r)).catch(e => console.error(e))
}
