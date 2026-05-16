const Checkpoint = require('../models/Checkpoint')
const Project = require('../models/Project')
const User = require('../models/User')

const PHASES = ['problem', 'plan', 'build', 'mvp', 'validation', 'demo']
const PHASE_INDEX = PHASES.reduce((acc, phase, index) => {
  acc[phase] = index
  return acc
}, {})

const toId = (value) => (value ? value.toString() : '')

const getNextPhase = (phase) => {
  const currentIndex = PHASE_INDEX[phase]
  if (currentIndex === undefined || currentIndex < 0) return 'problem'
  if (currentIndex >= PHASES.length - 1) return PHASES[PHASES.length - 1]
  return PHASES[currentIndex + 1]
}

const isTeamMemberOrOwner = (project, userId) => {
  if (!project || !userId) return false

  const userIdString = toId(userId)
  if (!userIdString) return false

  if (toId(project.owner) === userIdString) return true

  const teamMembers = project.teamMembers || []
  return teamMembers.some((memberId) => toId(memberId) === userIdString)
}

const getProjectParticipantIds = (project) => {
  const ids = new Set()
  const ownerId = toId(project?.owner)
  if (ownerId) ids.add(ownerId)

  ;(project?.teamMembers || []).forEach((memberId) => {
    const normalized = toId(memberId)
    if (normalized) ids.add(normalized)
  })

  return Array.from(ids)
}

const completeSprintForProject = async (project) => {
  if (!project) return

  project.phase = 'demo'
  project.status = 'completed'
  if (project.buildPhase) {
    project.buildPhase.lastActivity = new Date()
  }
  await project.save()

  const participantIds = getProjectParticipantIds(project)
  if (participantIds.length > 0) {
    await User.updateMany(
      { _id: { $in: participantIds } },
      { $set: { sprintStatus: 'completed' } }
    )
  }
}

const normalizeCheckpointPayload = (payload = {}) => {
  const submissionLink = typeof payload.submissionLink === 'string'
    ? payload.submissionLink.trim()
    : ''
  const description = typeof payload.description === 'string'
    ? payload.description.trim()
    : ''

  return { submissionLink, description }
}

exports.submitCheckpoint = async (req, res) => {
  try {
    const { projectId, phase } = req.body
    const userId = req.user?.userId
    const { submissionLink, description } = normalizeCheckpointPayload(req.body)

    const project = await Project.findById(projectId).select('owner teamMembers phase buildPhase status')
    if (!project) {
      return res.status(404).json({ message: 'Venture not found' })
    }

    if (!isTeamMemberOrOwner(project, userId)) {
      return res.status(403).json({ message: 'Only venture team contributors can submit checkpoints' })
    }

    const currentPhase = PHASES.includes(project.phase) ? project.phase : 'problem'
    if (phase !== currentPhase) {
      return res.status(400).json({ message: 'Invalid phase submission', currentPhase })
    }

    const existing = await Checkpoint.findOne({ projectId, phase }).select('_id')
    if (existing) {
      if (phase === 'demo') {
        await completeSprintForProject(project)
        return res.status(200).json({
          success: true,
          alreadyCompleted: true,
          message: 'Demo already submitted. Your sprint is complete.',
          sprintCompleted: true,
          projectPhase: 'demo'
        })
      }
      return res.status(409).json({ message: 'Checkpoint for this phase already submitted' })
    }

    const checkpoint = await Checkpoint.create({
      projectId,
      phase,
      submissionLink,
      description
    })

    if (currentPhase === 'demo') {
      await completeSprintForProject(project)
      return res.status(201).json({
        success: true,
        sprintCompleted: true,
        message: 'Sprint completed successfully.',
        checkpoint,
        projectPhase: 'demo'
      })
    }

    project.phase = getNextPhase(currentPhase)
    if (project.buildPhase) {
      project.buildPhase.lastActivity = new Date()
    }
    await project.save()

    return res.status(201).json({
      success: true,
      sprintCompleted: false,
      message: 'Checkpoint submitted successfully',
      checkpoint,
      projectPhase: project.phase
    })
  } catch (error) {
    if (error?.code === 11000) {
      if (req.body?.phase === 'demo') {
        try {
          const project = await Project.findById(req.body?.projectId).select('owner teamMembers phase buildPhase status')
          if (project) {
            await completeSprintForProject(project)
          }
        } catch (syncError) {
          console.error('Demo checkpoint completion sync error:', syncError)
        }

        return res.status(200).json({
          success: true,
          alreadyCompleted: true,
          message: 'Demo already submitted. Your sprint is complete.',
          sprintCompleted: true,
          projectPhase: 'demo'
        })
      }
      return res.status(409).json({ message: 'Checkpoint for this phase already submitted' })
    }

    console.error('Submit checkpoint error:', error)
    return res.status(500).json({ message: 'Failed to submit checkpoint' })
  }
}

exports.updateCheckpoint = async (req, res) => {
  try {
    const { projectId, phase } = req.params
    const userId = req.user?.userId
    const { submissionLink, description } = normalizeCheckpointPayload(req.body)

    const project = await Project.findById(projectId).select('owner teamMembers')
    if (!project) {
      return res.status(404).json({ message: 'Venture not found' })
    }

    if (!isTeamMemberOrOwner(project, userId)) {
      return res.status(403).json({ message: 'Only venture team contributors can edit checkpoints' })
    }

    const checkpoint = await Checkpoint.findOne({ projectId, phase })
    if (!checkpoint) {
      return res.status(404).json({
        message: 'Checkpoint for this phase does not exist yet. Submit this phase first.'
      })
    }

    checkpoint.submissionLink = submissionLink
    checkpoint.description = description
    await checkpoint.save()

    return res.json({
      success: true,
      message: 'Checkpoint updated successfully',
      checkpoint
    })
  } catch (error) {
    console.error('Update checkpoint error:', error)
    return res.status(500).json({ message: 'Failed to update checkpoint' })
  }
}

exports.getProjectCheckpoints = async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.userId

    const project = await Project.findById(projectId).select('owner teamMembers phase')
    if (!project) {
      return res.status(404).json({ message: 'Venture not found' })
    }

    if (!isTeamMemberOrOwner(project, userId)) {
      return res.status(403).json({ message: 'Only venture team contributors can view checkpoints' })
    }

    const checkpoints = await Checkpoint.find({ projectId }).lean()

    checkpoints.sort((a, b) => {
      const phaseDiff = (PHASE_INDEX[a.phase] ?? Number.MAX_SAFE_INTEGER) - (PHASE_INDEX[b.phase] ?? Number.MAX_SAFE_INTEGER)
      if (phaseDiff !== 0) return phaseDiff
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    })

    return res.json({
      projectId,
      currentPhase: PHASES.includes(project.phase) ? project.phase : 'problem',
      checkpoints
    })
  } catch (error) {
    console.error('Get checkpoints error:', error)
    return res.status(500).json({ message: 'Failed to fetch checkpoints' })
  }
}
