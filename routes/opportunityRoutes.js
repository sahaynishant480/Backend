const express = require('express')
const router = express.Router()
const { getOpportunities, registerHackathonProject, createOpportunity, updateOpportunity, deleteOpportunity } = require('../controllers/opportunityController')
const { protect } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/rbac')

router.get('/', getOpportunities)
router.post('/hackathons/:id/register', protect, registerHackathonProject)
router.post('/', protect, requireRole('admin'), createOpportunity)
router.put('/:id', protect, requireRole('admin'), updateOpportunity)
router.delete('/:id', protect, requireRole('admin'), deleteOpportunity)

module.exports = router
