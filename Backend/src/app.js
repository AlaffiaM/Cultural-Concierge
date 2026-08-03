const express = require('express')
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const { apiLimiter, aiLimiter } = require('./middleware/rateLimiter')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

const app = express()

// Security
app.use(helmet());
app.set('trust proxy', 1);

// HTTPS redirect in production (behind Cloudflare/nginx)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl)
  }
  next()
})

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'https://culture-conciage.vercel.app',
  'https://cultural--concierge.vercel.app',
  'https://culture-concierge.onrender.com',
]

const envOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : []

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...envOrigins])]

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api/', apiLimiter)
app.use('/api/ai/', aiLimiter)

app.use(express.json({ limit: '1mb' }));

// Serve built frontend in production
const distPath = path.join(__dirname, '..', '..', 'Frontend', 'dist')
app.use(express.static(distPath))

app.get('/api/status', (req, res) => {
  res.json({
    clerkConfigured: !!process.env.CLERK_SECRET_KEY,
    clerkKeyPrefix: process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.slice(0, 7) : null,
    nodeEnv: process.env.NODE_ENV,
  })
})

// Mount route modules
app.use('/api/venues', require('./routes/venueRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/system', require('./routes/systemRoutes'));
app.use('/api/scraper', require('./routes/scraperRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/advisories', require('./routes/advisoryRoutes'));
app.use('/api/subscribe', require('./routes/subscribeRoutes'));

// Global error handler
app.use(errorHandler)

// SPA catch-all — serve frontend for non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(distPath, 'index.html'))
})

// 404 catch-all — API routes only from here
app.use(notFoundHandler)

module.exports = app
