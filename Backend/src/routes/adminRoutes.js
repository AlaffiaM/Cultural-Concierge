const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const adminController = require('../controllers/adminController')

router.use(requireAdmin)

router.get('/stats', adminController.getStats)
router.get('/tags', adminController.getTags)
router.post('/tags', adminController.createTag)
router.get('/vibe-tags', adminController.getVibeTags)
router.get('/health', adminController.getHealth)
router.get('/team', adminController.getTeam)
router.get('/export/events', adminController.exportEvents)
router.get('/export/venues', adminController.exportVenues)
router.delete('/scraped-events', adminController.deleteScrapedEvents)
router.delete('/manual-events', adminController.deleteManualEvents)
router.get('/subscribers', adminController.getSubscribers)
router.get('/subscribers/export', adminController.exportSubscribers)

module.exports = router
