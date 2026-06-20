const express = require('express')
const router = express.Router()
const {
  adminStats,
  getAdminLogs,
  getAdminProjects,
  getAdminProjectDetails,
  updateAdminProject,
  archiveAdminProject,
  deleteAdminProject,
  addAdminTeamMember,
  removeAdminTeamMember,
  changeAdminProjectOwner,
  updateAdminMilestone,
  deleteAdminMilestone,
  deleteAdminBlocker,
  deleteAdminProjectFile
} = require('../controllers/adminController')
const validate = require('../middleware/validate')
const { requireRole } = require('../middleware/rbac')
const { emptyBody } = require('../validators')

router.get('/stats', requireRole('admin'), validate(emptyBody), adminStats)
router.get('/logs', requireRole('admin'), getAdminLogs)
router.get('/projects', requireRole('admin'), getAdminProjects)
router.get('/projects/:id', requireRole('admin'), getAdminProjectDetails)
router.patch('/projects/:id', requireRole('admin'), updateAdminProject)
router.patch('/projects/:id/archive', requireRole('admin'), archiveAdminProject)
router.delete('/projects/:id', requireRole('admin'), deleteAdminProject)
router.post('/projects/:id/team', requireRole('admin'), addAdminTeamMember)
router.delete('/projects/:id/team/:userId', requireRole('admin'), removeAdminTeamMember)
router.patch('/projects/:id/owner', requireRole('admin'), changeAdminProjectOwner)
router.patch('/projects/:id/milestones/:milestoneId', requireRole('admin'), updateAdminMilestone)
router.delete('/projects/:id/milestones/:milestoneId', requireRole('admin'), deleteAdminMilestone)
router.delete('/projects/:id/milestones/:milestoneId/blockers/:blockerId', requireRole('admin'), deleteAdminBlocker)
router.delete('/projects/:id/files/:fileId', requireRole('admin'), deleteAdminProjectFile)

module.exports = router
