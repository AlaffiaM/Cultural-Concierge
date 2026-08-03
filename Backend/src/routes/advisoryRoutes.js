const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const advisoryController = require('../controllers/advisoryController')

router.get('/:city', advisoryController.getAdvisoryByCity)
router.post('/run', requireAdmin, advisoryController.runAdvisoryScraper)

module.exports = router
