const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const venueController = require('../controllers/venueController')

function requireAdminForAllVenues(req, res, next) {
  if (req.query.all === 'true') return requireAdmin(req, res, next)
  next()
}

router.get('/lookup', requireAdmin, venueController.lookupVenueImage)
router.post('/batch-enrich', requireAdmin, venueController.batchEnrichVenues)
router.get('/', requireAdminForAllVenues, venueController.listVenues)
router.get('/:city', venueController.getVenuesByCity)
router.get('/vibes/:city', venueController.getVenuesByVibe)
router.get('/upcoming/:city', venueController.getUpcomingVenuesByCity)
router.post('/', requireAdmin, venueController.createVenue)
router.put('/:id', requireAdmin, venueController.updateVenue)
router.delete('/:id', requireAdmin, venueController.deleteVenue)
router.post('/bulk-delete', requireAdmin, venueController.bulkDeleteVenues)
router.post('/scraper/run', requireAdmin, venueController.runVenueScraper)
router.post('/scraper/accept', requireAdmin, venueController.acceptScrapedVenues)
router.post('/scraper/reject', requireAdmin, venueController.rejectScrapedVenues)

module.exports = router
