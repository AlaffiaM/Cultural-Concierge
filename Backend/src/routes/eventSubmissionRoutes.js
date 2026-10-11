const express = require('express')
const { requireAdmin } = require('../middleware/admin')
const { eventSubmissionLimiter, eventImageLimiter } = require('../middleware/rateLimiter')
const controller = require('../controllers/eventSubmissionController')

const router = express.Router()

router.post('/', eventSubmissionLimiter, controller.submitEvent)
router.post('/image', eventImageLimiter, controller.uploadSubmissionImage)
router.get('/', requireAdmin, controller.listSubmissions)
router.post('/:id/approve', requireAdmin, controller.approveSubmission)
router.post('/:id/reject', requireAdmin, controller.rejectSubmission)

module.exports = router
