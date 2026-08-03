const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const systemController = require('../controllers/systemController')

router.use(requireAdmin)

router.get('/health', systemController.getHealth)
router.get('/admin-emails', systemController.getAdminEmails)

module.exports = router
