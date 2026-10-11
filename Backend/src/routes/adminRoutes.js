const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const adminController = require('../controllers/adminController')
const blocklistController = require('../controllers/blocklistController')

router.use(requireAdmin)

router.get('/stats', adminController.getStats)
router.get('/tags', adminController.getTags)
router.get('/export/events', adminController.exportEvents)
router.get('/export/venues', adminController.exportVenues)
router.delete('/scraped-events', adminController.deleteScrapedEvents)
router.get('/subscribers', adminController.getSubscribers)
router.get('/subscribers/export', adminController.exportSubscribers)

// Skip List (user-controlled blocklist for events and venues)
router.get('/blocklist', blocklistController.get)
router.post('/blocklist', blocklistController.create)
router.delete('/blocklist/:id', blocklistController.remove)
router.post('/blocklist/clear', blocklistController.clear)

module.exports = router
