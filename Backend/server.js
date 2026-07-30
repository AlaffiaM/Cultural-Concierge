const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

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
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
