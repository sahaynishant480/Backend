const express = require('express')
const router = express.Router()
const { adminStats } = require('../controllers/adminController')

router.get('/stats', adminStats)

module.exports = router
