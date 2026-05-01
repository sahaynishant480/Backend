require('./config/loadEnv')
<<<<<<< HEAD
const app = require('./app')
=======
>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
const connectDB = require('./config/db')
const { validateEnv } = require('./config/env')
const mongoose = require('mongoose')
const { seedColleges } = require('./services/collegeService')
<<<<<<< HEAD
=======
const { initRedis, closeRedis } = require('./config/redisClient')
>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 5001

<<<<<<< HEAD
=======
let app
>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
let server

const startServer = async () => {
  try {
    validateEnv()
<<<<<<< HEAD
=======
    await initRedis()
    app = require('./app')

>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
    const uploadsDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    await connectDB(process.env.MONGO_URI)
    await seedColleges()

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

startServer()

process.on('SIGINT', async () => {
  try {
    if (server) {
      server.close()
    }
    await mongoose.connection.close()
<<<<<<< HEAD
=======
    await closeRedis()
>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
  } finally {
    process.exit()
  }
})

<<<<<<< HEAD
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
=======
process.on('unhandledRejection', async (err) => {
  console.error('Unhandled rejection:', err)
  try {
    await closeRedis()
  } catch (_) {}

>>>>>>> 2cbdbc2 (Harden auth brute-force protection with Redis-backed limiter)
  if (server) {
    server.close(() => process.exit(1))
  } else {
    process.exit(1)
  }
})
