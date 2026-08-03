require('dotenv').config()

const app = require('./app')
const { connectDB, startCleanup } = require('./config/db')

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    startCleanup()
  })
  .catch((err) => console.log('MongoDB connection failed:', err.message));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
