const express = require('express')
const router = express.Router()
const {
  getProfile,
  updateProfile,
  changePassword,
  getLeaderboard,
  getRank,
  getUserProjects,
  getAllUsers,
  getUserActivity,
  getAdminStats
} = require('../controllers/userController')

router.get('/me', getProfile)
router.put('/me', updateProfile)
router.put('/change-password', changePassword)
router.get('/leaderboard', getLeaderboard)
router.get('/rank', getRank)
router.get('/projects', getUserProjects)
router.get('/all', getAllUsers)
router.get('/activity', getUserActivity)
router.get('/admin-stats', getAdminStats)

module.exports = router
