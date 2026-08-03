const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const scraperController = require('../controllers/scraperController')

router.use(requireAdmin)

router.post('/run', scraperController.runScraper)
router.get('/history', scraperController.getScraperHistory)
router.post('/approve', scraperController.approveScrapedEvents)

module.exports = router
