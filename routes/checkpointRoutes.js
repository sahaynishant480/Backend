const express = require('express')
const { z } = require('zod')
const validate = require('../middleware/validate')
const { checkpoint } = require('../validators')
const {
  submitCheckpoint,
  getProjectCheckpoints,
  updateCheckpoint
} = require('../controllers/checkpointController')

const router = express.Router()

router.post('/submit', validate(checkpoint.checkpointSubmitBody), submitCheckpoint)

router.patch(
  '/:projectId/:phase',
  validate(z.object({
    params: checkpoint.checkpointUpdateParams,
    body: checkpoint.checkpointUpdateBody
  })),
  updateCheckpoint
)

router.get(
  '/:projectId',
  validate(z.object({ params: checkpoint.checkpointProjectParams })),
  getProjectCheckpoints
)

module.exports = router
