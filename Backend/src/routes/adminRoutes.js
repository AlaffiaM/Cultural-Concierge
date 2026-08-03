const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const adminController = require('../controllers/adminController')

router.use(requireAdmin)

router.get('/stats', adminController.getStats)
router.get('/tags', adminController.getTags)
router.get('/export/events', adminController.exportEvents)
router.get('/export/venues', adminController.exportVenues)
router.delete('/scraped-events', adminController.deleteScrapedEvents)
router.get('/subscribers', adminController.getSubscribers)
router.get('/subscribers/export', adminController.exportSubscribers)

module.exports = router
