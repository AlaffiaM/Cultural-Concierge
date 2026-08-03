const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/uploadController')
const { requireAdmin } = require('../middleware/admin')

router.post('/', requireAdmin, uploadController.uploadImage)

module.exports = router
