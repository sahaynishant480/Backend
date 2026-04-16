const Project = require('../models/Project')
const { createNotification } = require('./notificationController')
const { applyUserStats, POINTS } = require('../utils/points')

const CRITERIA_KEYS = ['innovation', 'usefulness', 'execution']

const roundScore = (value) => Math.round(value * 100) / 100

const parseScore = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric < 1 || numeric > 5) return null
  return numeric
}

const parseCriteria = (criteria) => {
  if (!criteria || typeof criteria !== 'object') {
    return { valid: false, message: 'Criteria ratings are required' }
  }

  const parsed = {}
  for (const key of CRITERIA_KEYS) {
    const parsedValue = parseScore(criteria[key])
    if (parsedValue === null) {
      return { valid: false, message: `${key.charAt(0).toUpperCase() + key.slice(1)} rating must be between 1 and 5` }
    }
    parsed[key] = parsedValue
  }

  return { valid: true, parsed }
}

const computeOverallFromCriteria = (criteria) =>
  roundScore((criteria.innovation + criteria.usefulness + criteria.execution) / CRITERIA_KEYS.length)

const buildFailureSummary = ({ averageRating, criteriaAverages, reviewsRequired }) => {
  const lowCriteria = CRITERIA_KEYS
    .filter((key) => (criteriaAverages[key] || 0) < 3)
    .map((key) => `${key}: ${criteriaAverages[key] || 0}/5`)

  const summaryParts = [
    `The project did not pass validation after ${reviewsRequired} reviews.`,
    `Overall score ${averageRating}/5 (minimum 3.5 required).`
  ]

  if (lowCriteria.length > 0) {
    summaryParts.push(`Needs improvement in ${lowCriteria.join(', ')} (minimum 3/5 each).`)
  } else {
    summaryParts.push('At least one score threshold was missed. Improve clarity and execution before retrying.')
  }

  return summaryParts.join(' ')
}

exports.listValidations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const parsedPage = Math.max(1, parseInt(page, 10) || 1)

    const projects = await Project.find({ status: 'validation' })
      .populate('owner', 'name')
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)

    const total = await Project.countDocuments({ status: 'validation' })

    res.json({
      projects,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    })
  } catch (error) {
    console.error('List validations error:', error)
    res.status(500).json({ message: 'Failed to fetch validation projects' })
  }
}

exports.submitValidation = async (req, res) => {
  try {
    const { projectId, feedback, criteria } = req.body
    const reviewerId = req.user?.userId

    if (!reviewerId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' })
    }

    const parsedCriteria = parseCriteria(criteria)
    if (!parsedCriteria.valid) {
      return res.status(400).json({ message: parsedCriteria.message })
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ message: 'Feedback is required' })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (project.status !== 'validation') {
      return res.status(400).json({ message: 'Project is not in validation' })
    }

    const reviewerIdString = reviewerId.toString()
    if (project.owner?.toString() === reviewerIdString) {
      return res.status(400).json({ message: 'Owners cannot review their own project' })
    }

    const teamIds = (project.teamMembers || []).map((id) => id.toString())
    if (teamIds.includes(reviewerIdString)) {
      return res.status(400).json({ message: 'Team members cannot review their own project' })
    }

    if (!project.validation) {
      project.validation = {}
    }

    if (!Array.isArray(project.validation.reviews)) {
      project.validation.reviews = []
    }

    const alreadyReviewed = project.validation.reviews.some((review) =>
      review.reviewer?.toString() === reviewerIdString
    )

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already submitted feedback' })
    }

    project.validation.reviews.push({
      reviewer: reviewerId,
      rating: computeOverallFromCriteria(parsedCriteria.parsed),
      criteria: parsedCriteria.parsed,
      feedback: feedback.trim()
    })

    const currentReviews = project.validation.currentReviews || 0
    const currentAverage = project.validation.averageRating || 0
    const newReviewCount = currentReviews + 1
    const derivedRating = computeOverallFromCriteria(parsedCriteria.parsed)
    const newAverage = ((currentAverage * currentReviews) + derivedRating) / newReviewCount

    const currentCriteriaAverages = project.validation.criteriaAverages || {}
    const criteriaAverages = CRITERIA_KEYS.reduce((acc, key) => {
      const currentCriterionAverage = Number(currentCriteriaAverages[key]) || 0
      const updatedAverage = ((currentCriterionAverage * currentReviews) + parsedCriteria.parsed[key]) / newReviewCount
      acc[key] = roundScore(updatedAverage)
      return acc
    }, {})

    project.validation.currentReviews = newReviewCount
    project.validation.averageRating = roundScore(newAverage)
    project.validation.criteriaAverages = criteriaAverages
    project.validation.validationStatus = project.validation.validationStatus || 'pending'

    let awardCompletionPoints = false
    const reviewsRequired = project.validation.reviewsRequired || 30
    if (newReviewCount >= reviewsRequired) {
      const meetsOverallThreshold = project.validation.averageRating >= 3.5
      const meetsCriteriaThreshold = CRITERIA_KEYS.every((key) => (criteriaAverages[key] || 0) >= 3)

      if (meetsOverallThreshold && meetsCriteriaThreshold) {
        project.validation.validationStatus = 'passed'
        project.validation.validatedAt = new Date()
        project.validation.featuredAt = new Date()
        project.status = 'validated'
        if (!project.validation.completionAwarded) {
          awardCompletionPoints = true
          project.validation.completionAwarded = true
        }
      } else {
        project.validation.validationStatus = 'failed'
        project.status = 'validation_failed'
        project.validation.lastFailureReason = buildFailureSummary({
          averageRating: project.validation.averageRating,
          criteriaAverages,
          reviewsRequired
        })
        project.validation.featuredAt = undefined
        project.validation.validatedAt = undefined
      }
    }

    await project.save()

    if (awardCompletionPoints) {
      await applyUserStats(project.owner, {
        points: POINTS.complete_project,
        inc: { projectsCompleted: 1 }
      })
    }

    await applyUserStats(reviewerId, {
      points: POINTS.validation_given,
      inc: { validationsGiven: 1 }
    })

    await createNotification(
      project.owner,
      'validation_feedback',
      'New validation feedback',
      `Your project ${project.title} received new feedback.`,
      project._id,
      reviewerId,
      false,
      `/project/${project._id}`
    )

    if (project.validation.validationStatus === 'passed') {
      await createNotification(
        project.owner,
        'project_featured',
        'Project validated',
        `${project.title} has been validated and featured!`,
        project._id,
        reviewerId,
        false,
        `/project/${project._id}`
      )
    }

    if (project.validation.validationStatus === 'failed') {
      await createNotification(
        project.owner,
        'validation_feedback',
        'Project did not pass validation',
        project.validation.lastFailureReason || `${project.title} did not reach the minimum validation score.`,
        project._id,
        reviewerId,
        false,
        `/project/${project._id}`
      )
    }

    res.status(201).json({
      message: 'Feedback submitted',
      projectId: project._id,
      currentReviews: project.validation.currentReviews,
      averageRating: project.validation.averageRating,
      criteriaAverages: project.validation.criteriaAverages,
      lastFailureReason: project.validation.lastFailureReason,
      validationStatus: project.validation.validationStatus
    })
  } catch (error) {
    console.error('Submit validation error:', error)
    res.status(500).json({ message: 'Failed to submit validation feedback' })
  }
}
