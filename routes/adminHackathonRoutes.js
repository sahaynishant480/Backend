const express = require('express')
const router = express.Router()
const { requireRole } = require('../middleware/rbac')
const {
  createHackathon,
  listHackathons,
  getHackathonDetails,
  updateHackathon,
  listHackathonRegistrations,
  getHackathonRegistrationDetails,
  updateHackathonRegistrationStatus,
  createHackathonStage,
  listHackathonStages,
  updateHackathonStage,
  createJudgingCriteria,
  listJudgingCriteria,
  updateJudgingCriteria,
  createJudgeReview,
  listStageEvaluations,
  getTeamEvaluation,
  updateJudgeReview,
  getHackathonLeaderboard,
  getHackathonReport,
  getHackathonExportData,
  submitHackathonProject,
  listHackathonSubmissions,
  updateHackathonSubmissionStatus,
  createHackathonAnnouncement,
  listHackathonAnnouncements,
  updateHackathonAnnouncement,
  deleteHackathonAnnouncement
} = require('../controllers/adminHackathonController')

router.get('/', requireRole('admin'), listHackathons)
router.post('/', requireRole('admin'), createHackathon)
router.get('/:id', requireRole('admin'), getHackathonDetails)
router.patch('/:id', requireRole('admin'), updateHackathon)
router.get('/:id/registrations', requireRole('admin'), listHackathonRegistrations)
router.get('/:id/registrations/:registrationId', requireRole('admin'), getHackathonRegistrationDetails)
router.patch('/:id/registrations/:registrationId/status', requireRole('admin'), updateHackathonRegistrationStatus)
router.get('/:id/stages', requireRole('admin'), listHackathonStages)
router.post('/:id/stages', requireRole('admin'), createHackathonStage)
router.patch('/:id/stages/:stageId', requireRole('admin'), updateHackathonStage)
router.get('/:id/stages/:stageId/criteria', requireRole('admin'), listJudgingCriteria)
router.post('/:id/stages/:stageId/criteria', requireRole('admin'), createJudgingCriteria)
router.patch('/:id/stages/:stageId/criteria/:criteriaId', requireRole('admin'), updateJudgingCriteria)
router.post('/:id/stages/:stageId/registrations/:registrationId/evaluations', requireRole('admin'), createJudgeReview)
router.get('/:id/stages/:stageId/evaluations', requireRole('admin'), listStageEvaluations)
router.get('/:id/stages/:stageId/registrations/:registrationId/evaluation', requireRole('admin'), getTeamEvaluation)
router.patch('/:id/stages/:stageId/evaluations/:reviewId', requireRole('admin'), updateJudgeReview)
router.get('/:id/leaderboard', requireRole('admin'), getHackathonLeaderboard)
router.get('/:id/report', requireRole('admin'), getHackathonReport)
router.get('/:id/export-data', requireRole('admin'), getHackathonExportData)
router.post('/:id/registrations/:registrationId/submission', requireRole('admin'), submitHackathonProject)
router.get('/:id/submissions', requireRole('admin'), listHackathonSubmissions)
router.patch('/:id/submissions/:submissionId/status', requireRole('admin'), updateHackathonSubmissionStatus)
router.get('/:id/announcements', requireRole('admin'), listHackathonAnnouncements)
router.post('/:id/announcements', requireRole('admin'), createHackathonAnnouncement)
router.patch('/:id/announcements/:announcementId', requireRole('admin'), updateHackathonAnnouncement)
router.delete('/:id/announcements/:announcementId', requireRole('admin'), deleteHackathonAnnouncement)

module.exports = router
