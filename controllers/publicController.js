const User = require('../models/User')
const Project = require('../models/Project')

exports.getPublicStats = async (req, res) => {
  try {
    const windowDays = 30
    const activeSince = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

    const [activeUsers, totalProjects] = await Promise.all([
      User.countDocuments({ lastActive: { $gte: activeSince } }),
      Project.countDocuments({ status: { $ne: 'archived' } })
    ])

    res.json({
      stats: {
        activeUsers,
        totalProjects,
        activeUsersWindowDays: windowDays
      }
    })
  } catch (error) {
    console.error('Public stats error:', error)
    res.status(500).json({ message: 'Failed to load stats' })
  }
}
