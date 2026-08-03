const multer = require('multer')
const { upload } = require('../utils/imageProcessor')

const storage = multer.memoryStorage()
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`), false)
  }
}

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})

function uploadImage(req, res) {
  uploadMiddleware.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` })
      }
      return res.status(400).json({ message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' })
    }

    try {
      const result = await upload(req.file.buffer, {
        folder: 'alaffia',
      })
      res.json({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      })
    } catch (uploadErr) {
      console.error('[upload] Cloudinary error:', uploadErr.message || uploadErr)
      res.status(500).json({ message: 'Image upload failed. Check Cloudinary configuration.' })
    }
  })
}

module.exports = { uploadImage, uploadMiddleware }
