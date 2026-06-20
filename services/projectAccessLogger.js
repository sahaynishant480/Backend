const ProjectAccessLog = require('../models/ProjectAccessLog')

const ACCESS_TYPES = new Set(['project_view', 'validation_view', 'package_download', 'admin_access'])

const toId = (value) => (value?._id || value)?.toString()

const logProjectAccess = async ({ project, projectId, user, userId, accessType, metadata = {} }) => {
  const resolvedProject = toId(project) || toId(projectId)
  const resolvedUser = toId(user) || toId(userId)
  if (!resolvedProject || !resolvedUser || !ACCESS_TYPES.has(accessType)) return null

  try {
    return await ProjectAccessLog.create({
      project: resolvedProject,
      user: resolvedUser,
      accessType,
      metadata,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Project access log error:', error)
    return null
  }
}

module.exports = { logProjectAccess, ACCESS_TYPES }
