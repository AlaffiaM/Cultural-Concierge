// Entry point: boots app.js, connects Mongo, starts past-event cleanup.
// Render starts this via `node src/server.js`.
require('dotenv').config()

const app = require('./app')
const { connectDB, startCleanup } = require('./config/db')

const PORT = process.env.PORT || 5000

// Server still boots so /api/status can report health if Mongo is down.
connectDB()
  .then(() => {
    startCleanup()
  })
  .catch((err) => console.log('MongoDB connection failed:', err.message));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
