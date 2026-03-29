const User = require('../models/User')

const POINTS = {
  create_project: 15,
  join_project: 8,
  complete_project: 25,
  validation_given: 3,
  helpful_feedback: 5,
  inactivity_penalty: -10
}

const computeBadges = (user) => {
  const badges = []

  if ((user.projectsCreated || 0) >= 1) badges.push('🚀 Builder')
  if ((user.projectsJoined || 0) >= 3) badges.push('🤝 Collaborator')
  if ((user.validationsGiven || 0) >= 10) badges.push('🧠 Validator')
  if ((user.inactivePenalties || 0) === 0 && user.lastActive && user.lastActive > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    badges.push('🔥 Consistent')
  }
  if ((user.points || 0) >= 100) badges.push('🏆 Top Performer')

  return badges
}

const applyUserStats = async (userId, { points = 0, inc = {}, set = {}, touchActive = true } = {}) => {
  if (!userId) return null
  const user = await User.findById(userId)
  if (!user) return null

  if (points) {
    user.points = (user.points || 0) + points
  }

  Object.entries(inc).forEach(([key, value]) => {
    user[key] = (user[key] || 0) + value
  })

  Object.entries(set).forEach(([key, value]) => {
    user[key] = value
  })

  if (touchActive) {
    user.lastActive = new Date()
  }

  user.badges = computeBadges(user)
  await user.save()
  return user
}

module.exports = {
  POINTS,
  computeBadges,
  applyUserStats
}
