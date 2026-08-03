const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const eventController = require('../controllers/eventController')

router.get('/', eventController.listEvents)
router.get('/upcoming', eventController.getUpcoming)
router.get('/ghosts', requireAdmin, eventController.getGhosts)
router.get('/pending', requireAdmin, eventController.getPending)
router.get('/today', eventController.getToday)
router.get('/:id', eventController.getEventById)
router.post('/', requireAdmin, eventController.createEvent)
router.put('/:id', requireAdmin, eventController.updateEvent)
router.put('/:id/approve', requireAdmin, eventController.approveEvent)
router.post('/deduplicate', requireAdmin, eventController.deduplicateEvents)
router.delete('/:id', requireAdmin, eventController.deleteEvent)

module.exports = router
