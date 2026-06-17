const express = require('express')
const router = express.Router()
const { requireRole } = require('../middleware/rbac')
const {
  listAdminProjects,
  getAdminProjectDetails,
  updateAdminProjectRecord,
  getAdminProjectTeam,
  addAdminProjectTeamMember,
  removeAdminProjectTeamMember,
  updateAdminProjectOwner,
  listAdminProjectMilestones,
  updateAdminProjectMilestone,
  deleteAdminProjectMilestone,
  updateAdminProjectBlocker,
  listAdminProjectFiles,
  removeAdminProjectFile,
  archiveAdminProjectRecord,
  restoreAdminProjectRecord,
  permanentlyRemoveAdminProjectRecord
} = require('../controllers/adminProjectController')

router.get('/', requireRole('admin'), listAdminProjects)
router.get('/:id', requireRole('admin'), getAdminProjectDetails)
router.patch('/:id', requireRole('admin'), updateAdminProjectRecord)
router.get('/:id/team', requireRole('admin'), getAdminProjectTeam)
router.post('/:id/team', requireRole('admin'), addAdminProjectTeamMember)
router.delete('/:id/team/:userId', requireRole('admin'), removeAdminProjectTeamMember)
router.patch('/:id/owner', requireRole('admin'), updateAdminProjectOwner)
router.get('/:id/milestones', requireRole('admin'), listAdminProjectMilestones)
router.patch('/:id/milestones/:milestoneId', requireRole('admin'), updateAdminProjectMilestone)
router.delete('/:id/milestones/:milestoneId', requireRole('admin'), deleteAdminProjectMilestone)
router.patch('/:id/milestones/:milestoneId/blockers/:blockerId', requireRole('admin'), updateAdminProjectBlocker)
router.get('/:id/files', requireRole('admin'), listAdminProjectFiles)
router.delete('/:id/files/:fileId', requireRole('admin'), removeAdminProjectFile)
router.patch('/:id/archive', requireRole('admin'), archiveAdminProjectRecord)
router.patch('/:id/restore', requireRole('admin'), restoreAdminProjectRecord)
router.delete('/:id/permanent', requireRole('admin'), permanentlyRemoveAdminProjectRecord)

module.exports = router
