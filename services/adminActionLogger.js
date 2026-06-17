const AdminActionLog = require('../models/AdminActionLog')

const logAdminAction = async ({ adminUser, action, targetType, targetId = '', details = {} }) => {
  if (!adminUser || !action || !targetType) return null

  try {
    return await AdminActionLog.create({
      adminUser,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : '',
      details,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Admin action log error:', error)
    return null
  }
}

module.exports = { logAdminAction }
