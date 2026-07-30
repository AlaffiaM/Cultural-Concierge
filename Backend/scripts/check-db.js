require('dotenv').config()
const mongoose = require('mongoose')
const Event = require('../models/Event')

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const total = await Event.countDocuments()
  const bySource = await Event.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }])
  console.log('Total events:', total)
  console.log('By source:', JSON.stringify(bySource))
  process.exit()
}).catch(e => { console.error(e); process.exit(1) })
