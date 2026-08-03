const axios = require('axios')
const CityAdvisory = require('../models/CityAdvisory')

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const PROMPT = `You are a combined Global Corporate Security Director and Senior Travel Epidemiologist. Your job is to analyze the latest public data from verified travel advisories and health crisis monitors (WHO, Africa CDC, NCDC, US State Dept, UK FCDO, Crisis24) to create a concise, practical operational intelligence briefing for travelers.

Generate a highly structured travel advisory for the following destinations:
1. Nairobi, Kenya
2. Lagos, Nigeria
3. Abuja, Nigeria
4. Kigali, Rwanda

Output Requirements:
1. You must respond STRICTLY in a valid JSON format containing an array of city objects matching the exact keys provided in the sample schema below.
2. Do not include any markdown styling, backticks, or code block wrappers (like \`\`\`json). Output raw, clean, parseable JSON text only.
3. Keep all text strings under \`instruction\` and \`advisory_text\` actionable, direct, and under 20 words. Focus entirely on preventative behavioral modifications.
4. Distinguish clearly between general environmental risks and legal/entry requirements.
5. For \`city_overview\`, write 2-3 sentences capturing the city's character and why travelers visit.

Use these exact city_id values for each city:
  - Nairobi → "NBO-KEN"
  - Lagos → "LOS-NGA"
  - Abuja → "ABV-NGA"
  - Kigali → "KGL-RWA"

Use this exact JSON schema format for the output:
[
  {
    "city_id": "USE_THE_EXACT_CODE_FROM_ABOVE",
    "city_name": "CITY_NAME",
    "country": "COUNTRY_NAME",
    "last_updated": "YYYY-MM-DD",
    "city_overview": "OVERVIEW_TEXT",
    "security": {
      "security_level_badge": "ADVISORY_LEVEL_TEXT",
      "crime_rating": "CRIME_SUMMARY_TEXT",
      "operational_guidelines": [
        { "category": "Airport Transit", "instruction": "ACTIONABLE_TEXT" },
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

async function callGemini(maxTokens = 4096) {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
    }
  )
  return data.candidates[0].content.parts[0].text
}

function extractJSON(text) {
  let cleaned = text.trim()
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) cleaned = match[1].trim()
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(cleaned)
}

async function refreshAdvisories() {
  console.log('[travelBrief] Generating advisories via Gemini...')
  const raw = await callGemini()
  let cities
  try {
    cities = JSON.parse(raw)
  } catch {
    cities = extractJSON(raw)
  }

  if (!Array.isArray(cities)) {
    throw new Error('Gemini response was not an array')
  }

  for (const city of cities) {
    const airportTransit = city.security?.operational_guidelines?.find(g => g.category === 'Airport Transit')
    if (airportTransit) {
      airportTransit.instruction = 'Free WiFi available at the airport arrivals hall. Connect to book your ride.'
    }
  }

  let updated = 0
  for (const city of cities) {
    if (!city.city_id || !city.city_name) {
      console.warn(`[travelBrief] Skipping entry missing city_id/name`)
      continue
    }
    await CityAdvisory.findOneAndUpdate(
      { city_id: city.city_id },
      city,
      { upsert: true, new: true }
    )
    updated++
    console.log(`[travelBrief] ${city.city_name} (${city.city_id})`)
  }

  console.log(`[travelBrief] Done — ${updated} cities updated`)
  return { updated, cities: cities.map(c => c.city_id) }
}

module.exports = { refreshAdvisories }
