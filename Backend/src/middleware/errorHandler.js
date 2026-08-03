function errorHandler(err, req, res, next) {
  console.error('[unhandled]', err)
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
  next(err)
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' })
}

module.exports = { errorHandler, notFoundHandler }
