const express = require('express')
const router = express.Router()
const { submitValidation, listValidations } = require('../controllers/validationController')

router.get('/', listValidations)
router.post('/', submitValidation)

module.exports = router
