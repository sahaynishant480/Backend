const express = require('express')
const cors = require('cors')
const path = require('path')
const { protect } = require('./middleware/authMiddleware')
const { errorHandler, notFound } = require('./middleware/errorMiddleware')
const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(cors())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`${req.method} ${req.originalUrl}`)
  }
  next()
})

app.get('/', (req, res) => res.send('API running'))

// Auth routes
const authRoutes = require('./routes/authRoutes')
app.use('/auth', authRoutes)
app.use('/api/auth', authRoutes)

// College routes
const collegeRoutes = require('./routes/collegeRoutes')
app.use('/colleges', collegeRoutes)
app.use('/api/colleges', collegeRoutes)

// Public routes
const publicRoutes = require('./routes/publicRoutes')
app.use('/public', publicRoutes)
app.use('/api/public', publicRoutes)

// Project routes (protected)
const projectRoutes = require('./routes/projectRoutes')
app.use('/projects', protect, projectRoutes)
app.use('/api/projects', protect, projectRoutes)

// User routes (protected)
const userRoutes = require('./routes/userRoutes')
app.use('/users', protect, userRoutes)
app.use('/api/users', protect, userRoutes)

// Notification routes (protected)
const notificationRoutes = require('./routes/notificationRoutes')
app.use('/notifications', protect, notificationRoutes)
app.use('/api/notifications', protect, notificationRoutes)

// Validation routes (protected)
const validationRoutes = require('./routes/validationRoutes')
app.use('/validations', protect, validationRoutes)
app.use('/api/validations', protect, validationRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
