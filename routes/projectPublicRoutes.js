const express = require('express')
const router = express.Router()

// Public proof pages were removed for launch. Keep this router loadable so
// existing app mounts do not crash while protected workspace routes remain active.

module.exports = router
