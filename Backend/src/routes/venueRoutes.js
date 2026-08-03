const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const venueController = require('../controllers/venueController')

router.get('/lookup', requireAdmin, venueController.lookupVenueImage)
router.post('/batch-enrich', requireAdmin, venueController.batchEnrichVenues)
router.get('/', venueController.listVenues)
router.get('/:city', venueController.getVenuesByCity)
router.get('/vibes/:city', venueController.getVenuesByVibe)
router.get('/upcoming/:city', venueController.getUpcomingVenuesByCity)
router.post('/', requireAdmin, venueController.createVenue)
router.put('/:id', requireAdmin, venueController.updateVenue)
router.delete('/:id', requireAdmin, venueController.deleteVenue)
router.post('/scraper/run', requireAdmin, venueController.runVenueScraper)
router.post('/scraper/accept', requireAdmin, venueController.acceptScrapedVenues)

module.exports = router
