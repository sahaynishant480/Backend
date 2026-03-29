const express = require('express')
const router = express.Router()
const { requestToJoin } = require('../controllers/joinRequestController')

router.post('/', requestToJoin)

module.exports = router
