const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

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

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})
app.use('/api/', apiLimiter)

// Stricter limit for paid AI endpoint
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded for AI endpoint.' },
})
app.use('/api/ai/', aiLimiter)

app.use(express.json({ limit: '1mb' }));

// Serve built frontend in production
const distPath = path.join(__dirname, "..", "alaffia-concierge", "dist")
app.use(express.static(distPath))

// Mount route modules
const venuesRoute = require("./routes/venues");
const eventsRoute = require("./routes/events");
const aiRoute = require("./routes/ai");
const adminRoute = require("./routes/admin");
const scraperRoute = require("./routes/scraper");
const uploadsRoute = require("./routes/uploads");
const advisoriesRoute = require("./routes/advisories");
const subscribeRoute = require("./routes/subscribe");
app.use("/api/venues", venuesRoute);
app.use("/api/events", eventsRoute);
app.use("/api/ai", aiRoute);
app.use("/api/admin", adminRoute);
app.use("/api/scraper", scraperRoute);
app.use("/api/uploads", uploadsRoute);
app.use("/api/advisories", advisoriesRoute);
app.use("/api/subscribe", subscribeRoute);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[unhandled]', err)
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
  next(err)
})

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected")
    const Event = require('./models/Event')
    const cleanup = async () => {
      try {
        const { deletedCount } = await Event.deleteMany({ date: { $lt: new Date() } })
        if (deletedCount > 0) console.log(`[cleanup] Deleted ${deletedCount} past event(s)`)
      } catch (err) {
        console.error('[cleanup] Error:', err.message)
      }
    }
    setTimeout(cleanup, 30000)
    setInterval(cleanup, 3600000)
  })
  .catch((err) => console.log("MongoDB connection failed:", err.message));

// SPA catch-all — serve frontend for non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next()
  res.sendFile(path.join(distPath, "index.html"))
})

// 404 catch-all — API routes only from here
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
