const { cloudinary } = require('../config/cloudinary')

function upload(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'alaffia',
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          ...(options.transformation || []),
        ],
        ...options,
      },
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

module.exports = { upload }
