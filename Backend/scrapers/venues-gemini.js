const axios = require('axios')

const SOURCE = 'gemini'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const CITIES = [
  { name: 'Lagos', country: 'Nigeria' },
  { name: 'Abuja', country: 'Nigeria' },
  { name: 'Kigali', country: 'Rwanda' },
  { name: 'Nairobi', country: 'Kenya' },
]

async function callGemini(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
        }
      )
      const text = data.candidates[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty Gemini response')
      return text
    } catch (err) {
      if (i < retries && (err.response?.status === 503 || err.response?.status === 429)) {
        const wait = 3000 * (i + 1)
        console.log(`[gemini] retrying after ${wait}ms (${err.response?.status})`)
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
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1].trim()) } catch {}
  }

  const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch {}
  }

  return null
}

async function researchCity(cityName, country) {
  try {
    const prompt = `List 15 cultural, wellness, and social venues in ${cityName}, ${country}.

For each venue, return a JSON object with these fields:
- "name": the venue name
- "type": one of "Museum", "Gallery", "Park", "Theatre", "Cultural Centre", "Wellness Centre", "Market", "Monument", "Historical Site", "Sports Venue", "Place of Worship", "Library", "Beach", "Nature Reserve", "Hotel", "Restaurant", "Landmark"
- "pillar": one of "CULTURE", "WELLNESS", "SOCIAL"
- "description": a 1-2 sentence description
- "tip": a practical tip for visitors
- "address": the full street address
- "vibeTags": an array of 2-4 relevant tags like "Art", "Music", "History", "Food", "Wellness", "Nature", "Adventure", "Social", "Relaxation", "Culture", "Family", "Nightlife"
- "coordinates": { "lat": number, "lng": number }

Focus on venues interesting for cultural tourists: museums, art galleries, parks, gardens, theatres, cultural centres, markets, stadiums, monuments, historical sites, landmarks, beaches, nature reserves, wildlife parks, botanic gardens, wellness centres, spas, hotels, resorts, restaurants.

Return ONLY a valid JSON array of objects, no other text. Example:
[
  {
    "name": "Example Venue",
    "type": "Museum",
    "pillar": "CULTURE",
    "description": "A brief description.",
    "tip": "A practical tip.",
    "address": "123 Street, City",
    "vibeTags": ["Art", "History"],
    "coordinates": { "lat": -1.28, "lng": 36.82 }
  }
]`

    const text = await callGemini(prompt)
    const data = extractJSON(text)
    if (!data || !Array.isArray(data)) {
      console.log(`[gemini] ${cityName}: failed to parse response, raw text:`, text.slice(0, 200))
      return []
    }
    return data
  } catch (err) {
    console.log(`[gemini] ${cityName}: error — ${err.message || err}`)
    return []
  }
}

async function scrape() {
  const all = []
  for (const city of CITIES) {
    console.log(`[gemini] ${city.name}: researching venues...`)
    const venues = await researchCity(city.name, city.country)
    console.log(`[gemini] ${city.name}: ${venues.length} venues found`)

    for (const v of venues) {
      all.push({
        name: v.name || 'Unknown',
        city: city.name,
        type: v.type || 'Venue',
        pillar: v.pillar || 'CULTURE',
        description: v.description || '',
        tip: v.tip || '',
        address: v.address || '',
        vibeTags: v.vibeTags || [],
        tags: [],
        images: v.imageUrl ? [v.imageUrl] : [],
        coordinates: v.coordinates || null,
        source: SOURCE,
      })
    }

    await new Promise(r => setTimeout(r, 5000))
  }

  return all
}

module.exports = { scrape, SOURCE }

if (require.main === module) {
  scrape().then(r => {
    console.log(`\nTotal: ${r.length} venues`)
    const counts = {}
    for (const v of r) counts[v.city] = (counts[v.city] || 0) + 1
    for (const [city, n] of Object.entries(counts)) console.log(`  ${city}: ${n}`)
    console.log()
    for (const v of r) {
      const hasImage = (v.images && v.images.length > 0) ? '📷' : '  '
      console.log(`${hasImage} ${v.name.padEnd(43)} | ${v.city.padEnd(8)} | ${v.pillar.padEnd(10)} | ${v.address.slice(0, 40).padEnd(40)} | ${(v.vibeTags || []).join(', ')}`)
    }
  }).catch(e => console.error(e))
}
