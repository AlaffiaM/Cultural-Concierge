const { suggestTags } = require('../services/aiService')

async function suggestTagsForEvent(req, res) {
  const { name, description, type, pillar } = req.body
  if (!description) {
    return res.status(400).json({ message: 'Description is required' })
  }

  const result = await suggestTags({ name, description, type, pillar })
  res.json(result)
}

module.exports = { suggestTagsForEvent }
