const axios = require('axios')

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

async function callGemini(prompt, maxTokens = 300) {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens },
    },
    {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  )
  return data.candidates[0].content.parts[0].text
}

function extractKeywordTags(text) {
  const keywords = []
  const lower = text.toLowerCase()
  if (lower.includes('jazz') || lower.includes('music')) keywords.push('Music')
  if (lower.includes('art') || lower.includes('exhibition')) keywords.push('Art')
  if (lower.includes('food') || lower.includes('dinner') || lower.includes('cuisine')) keywords.push('Food')
  if (lower.includes('wellness') || lower.includes('spa') || lower.includes('yoga')) keywords.push('Wellness')
  if (lower.includes('dance') || lower.includes('performance')) keywords.push('Performance')
  if (lower.includes('workshop') || lower.includes('class')) keywords.push('Workshop')
  if (lower.includes('market')) keywords.push('Market')
  if (lower.includes('film') || lower.includes('cinema')) keywords.push('Film')
  if (lower.includes('fashion')) keywords.push('Fashion')
  if (keywords.length === 0) keywords.push('Cultural')
  return keywords.slice(0, 6)
}

async function suggestTags({ name, description, type, pillar }) {
  const prompt = `
    You are a cultural event tagger for Africa. Based on the event details below, suggest 3-6 relevant tags.
    Each tag should be a single word or short phrase prefixed with #.
    Respond with ONLY a comma-separated list of tags, no other text.

    Event name: ${name || 'Untitled'}
    Event type: ${type || 'General'}
    Pillar: ${pillar || 'CULTURE'}
    Description: ${description}
  `

  try {
    let text = await callGemini(prompt)
    text = text.replace(/^["']|["']$/g, '')
    const tags = text.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    return { tags }
  } catch (err) {
    console.log('Gemini suggest-tags error:', err.message)
    return { tags: extractKeywordTags(description) }
  }
}

module.exports = { callGemini, suggestTags, extractKeywordTags }
