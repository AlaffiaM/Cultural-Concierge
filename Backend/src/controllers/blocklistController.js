const { listBlocks, addBlock, removeBlock, clearBlock } = require('../services/blocklistService')

async function get(req, res) {
  try {
    const { scope } = req.query
    const entries = await listBlocks(scope)
    res.json(entries)
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function create(req, res) {
  try {
    const { scope, term, city, source, note } = req.body
    const entry = await addBlock({ scope, term, city, source, note })
    res.status(201).json(entry)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

async function remove(req, res) {
  try {
    const entry = await removeBlock(req.params.id)
    if (!entry) return res.status(404).json({ message: 'Blocklist entry not found' })
    res.json({ message: 'Blocklist entry removed' })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function clear(req, res) {
  try {
    const { scope } = req.body
    const { deletedCount } = await clearBlock(scope)
    res.json({ deleted: deletedCount })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

module.exports = { get, create, remove, clear }