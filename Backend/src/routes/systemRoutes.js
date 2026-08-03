const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const systemController = require('../controllers/systemController')

router.use(requireAdmin)

router.get('/health', systemController.getHealth)

module.exports = router
