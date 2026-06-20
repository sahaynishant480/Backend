const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const Project = require('../models/Project')
const Milestone = require('../models/Milestone')
const User = require('../models/User')
const { logAdminAction } = require('../services/adminActionLogger')
const { logProjectAccess } = require('../services/projectAccessLogger')

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value)
const adminId = (req) => req.user?._id || req.user?.userId
const toId = (value) => (value?._id || value)?.toString()
const uploadsDir = path.join(__dirname, '..', 'uploads')
const findProjectFile = (project, fileId) => {
  const files = [...(project.files || []), ...(project.validation?.sharedFiles || [])]
  return files.find((item) => item._id?.toString() === fileId || item.filename === fileId)
}

exports.listAdminProjects = async (req, res) => {
  try {
    const projects = await Project.find({})
      .select('title shortPitch category owner teamMembers lifecycleStage readinessScore visibility createdAt updatedAt')
      .populate('owner', 'name email role')
      .populate('teamMembers', 'name email role')
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean()

    res.json({ projects })
  } catch (error) {
    console.error('Admin project list error:', error)
    res.status(500).json({ message: 'Failed to load projects' })
  }
}

exports.getAdminProjectDetails = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })

    const project = await Project.findById(id)
      .populate('owner', 'name email role college course yearOfStudy')
      .populate('teamMembers', 'name email role college course yearOfStudy')
      .populate('files.uploadedBy', 'name email')
      .populate('validation.sharedFiles.uploadedBy', 'name email')
      .lean()

    if (!project) return res.status(404).json({ message: 'Project not found' })

    await logProjectAccess({
      projectId: id,
      userId: adminId(req),
      accessType: 'admin_access',
      metadata: { source: 'admin_project_records' }
    })

    const milestones = await Milestone.find({ projectId: id })
      .select('title description owner lifecycleStage dueDate status priority blockers blockerDetails completedAt createdAt updatedAt')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ project, milestones })
  } catch (error) {
    console.error('Admin project detail error:', error)
    res.status(500).json({ message: 'Failed to load project details' })
  }
}

exports.updateAdminProjectRecord = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })

    const allowedFields = ['title', 'description', 'category', 'lifecycleStage', 'readinessScore', 'visibility']
    const updates = {}
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })

    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    Object.assign(project, updates)
    await project.save()

    await logAdminAction({
      adminUser: adminId(req),
      action: 'update_project_record',
      targetType: 'project',
      targetId: project._id,
      details: { fields: Object.keys(updates) }
    })

    res.json({ project })
  } catch (error) {
    console.error('Admin project update error:', error)
    res.status(500).json({ message: 'Failed to update project' })
  }
}

exports.getAdminProjectTeam = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id)
      .select('owner teamMembers')
      .populate('owner', 'name email role')
      .populate('teamMembers', 'name email role')
      .lean()
    if (!project) return res.status(404).json({ message: 'Project not found' })
    res.json({ owner: project.owner, teamMembers: project.teamMembers || [] })
  } catch (error) {
    console.error('Admin project team error:', error)
    res.status(500).json({ message: 'Failed to load project team' })
  }
}

exports.addAdminProjectTeamMember = async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body
    if (!isObjectId(id) || !isObjectId(userId)) return res.status(400).json({ message: 'Invalid id' })
    const [project, user] = await Promise.all([Project.findById(id), User.findById(userId)])
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (toId(project.owner) !== userId && !(project.teamMembers || []).some((m) => toId(m) === userId)) {
      project.teamMembers.push(userId)
      await project.save()
    }
    await logAdminAction({ adminUser: adminId(req), action: 'add_project_team_member', targetType: 'project', targetId: id, details: { userId } })
    res.json({ project })
  } catch (error) {
    console.error('Admin add team member error:', error)
    res.status(500).json({ message: 'Failed to add team member' })
  }
}

exports.removeAdminProjectTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params
    if (!isObjectId(id) || !isObjectId(userId)) return res.status(400).json({ message: 'Invalid id' })
    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    project.teamMembers = (project.teamMembers || []).filter((m) => toId(m) !== userId)
    await project.save()
    await logAdminAction({ adminUser: adminId(req), action: 'remove_project_team_member', targetType: 'project', targetId: id, details: { userId } })
    res.json({ project })
  } catch (error) {
    console.error('Admin remove team member error:', error)
    res.status(500).json({ message: 'Failed to remove team member' })
  }
}

exports.updateAdminProjectOwner = async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body
    if (!isObjectId(id) || !isObjectId(userId)) return res.status(400).json({ message: 'Invalid id' })
    const [project, user] = await Promise.all([Project.findById(id), User.findById(userId)])
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!user) return res.status(404).json({ message: 'User not found' })
    const oldOwner = toId(project.owner)
    if (oldOwner && oldOwner !== userId && !(project.teamMembers || []).some((m) => toId(m) === oldOwner)) {
      project.teamMembers.push(oldOwner)
    }
    project.owner = userId
    project.teamMembers = (project.teamMembers || []).filter((m) => toId(m) !== userId)
    await project.save()
    await logAdminAction({ adminUser: adminId(req), action: 'update_project_owner', targetType: 'project', targetId: id, details: { oldOwner, newOwner: userId } })
    res.json({ project })
  } catch (error) {
    console.error('Admin update owner error:', error)
    res.status(500).json({ message: 'Failed to update project owner' })
  }
}

exports.listAdminProjectMilestones = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const milestones = await Milestone.find({ projectId: id })
      .populate('owner', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ milestones })
  } catch (error) {
    console.error('Admin milestones list error:', error)
    res.status(500).json({ message: 'Failed to load milestones' })
  }
}

exports.updateAdminProjectMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params
    if (!isObjectId(id) || !isObjectId(milestoneId)) return res.status(400).json({ message: 'Invalid id' })
    const allowed = ['title', 'description', 'owner', 'lifecycleStage', 'dueDate', 'dependencies', 'blockers', 'blockerDetails', 'status', 'priority']
    const milestone = await Milestone.findOne({ _id: milestoneId, projectId: id })
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) milestone[field] = req.body[field]
    })
    if (milestone.status === 'completed' && !milestone.completedAt) milestone.completedAt = new Date()
    await milestone.save()
    await logAdminAction({ adminUser: adminId(req), action: 'update_project_milestone', targetType: 'milestone', targetId: milestone._id, details: { projectId: id, fields: Object.keys(req.body || {}) } })
    res.json({ milestone })
  } catch (error) {
    console.error('Admin milestone update error:', error)
    res.status(500).json({ message: 'Failed to update milestone' })
  }
}

exports.deleteAdminProjectMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params
    if (!isObjectId(id) || !isObjectId(milestoneId)) return res.status(400).json({ message: 'Invalid id' })
    const milestone = await Milestone.findOneAndDelete({ _id: milestoneId, projectId: id })
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
    await logAdminAction({ adminUser: adminId(req), action: 'delete_project_milestone', targetType: 'milestone', targetId: milestone._id, details: { projectId: id } })
    res.json({ message: 'Milestone removed' })
  } catch (error) {
    console.error('Admin milestone delete error:', error)
    res.status(500).json({ message: 'Failed to remove milestone' })
  }
}

exports.updateAdminProjectBlocker = async (req, res) => {
  try {
    const { id, milestoneId, blockerId } = req.params
    if (!isObjectId(id) || !isObjectId(milestoneId)) return res.status(400).json({ message: 'Invalid id' })
    const milestone = await Milestone.findOne({ _id: milestoneId, projectId: id })
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
    const blocker = (milestone.blockerDetails || []).find((item) => item.blockerId === blockerId)
    if (!blocker) return res.status(404).json({ message: 'Blocker not found' })
    ;['type', 'description', 'status'].forEach((field) => {
      if (req.body[field] !== undefined) blocker[field] = req.body[field]
    })
    if (blocker.status === 'resolved' && !blocker.resolvedAt) blocker.resolvedAt = new Date()
    await milestone.save()
    await logAdminAction({ adminUser: adminId(req), action: 'update_project_blocker', targetType: 'milestone', targetId: milestone._id, details: { projectId: id, blockerId } })
    res.json({ milestone })
  } catch (error) {
    console.error('Admin blocker update error:', error)
    res.status(500).json({ message: 'Failed to update blocker' })
  }
}

exports.listAdminProjectFiles = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id)
      .select('files validation.sharedFiles')
      .populate('files.uploadedBy', 'name email')
      .populate('validation.sharedFiles.uploadedBy', 'name email')
      .lean()
    if (!project) return res.status(404).json({ message: 'Project not found' })
    res.json({ files: project.files || [], validationFiles: project.validation?.sharedFiles || [] })
  } catch (error) {
    console.error('Admin files list error:', error)
    res.status(500).json({ message: 'Failed to load project files' })
  }
}

exports.downloadAdminProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id).select('files validation.sharedFiles')
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const file = findProjectFile(project, fileId)
    if (!file?.filename) return res.status(404).json({ message: 'File not found' })
    const filePath = path.join(uploadsDir, path.basename(file.filename))
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Stored file missing' })
    return res.download(filePath, file.originalName || path.basename(file.filename))
  } catch (error) {
    console.error('Admin file download error:', error)
    res.status(500).json({ message: 'Failed to download project file' })
  }
}

exports.removeAdminProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const file = findProjectFile(project, fileId)
    if (!file) return res.status(404).json({ message: 'File not found' })
    project.files = (project.files || []).filter((item) => item._id?.toString() !== fileId && item.filename !== fileId)
    if (project.validation?.sharedFiles) {
      project.validation.sharedFiles = project.validation.sharedFiles.filter((item) => item.filename !== file.filename)
    }
    await project.save()
    fs.promises.unlink(path.join(uploadsDir, path.basename(file.filename))).catch(() => {})
    await logAdminAction({ adminUser: adminId(req), action: 'remove_project_file', targetType: 'project', targetId: id, details: { fileId, filename: file.filename } })
    res.json({ message: 'File removed' })
  } catch (error) {
    console.error('Admin remove file error:', error)
    res.status(500).json({ message: 'Failed to remove project file' })
  }
}

exports.archiveAdminProjectRecord = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const previousStage = project.lifecycleStage
    project.lifecycleStage = 'archived'
    await project.save()
    await logAdminAction({ adminUser: adminId(req), action: 'archive_project_record', targetType: 'project', targetId: id, details: { previousStage } })
    res.json({ project })
  } catch (error) {
    console.error('Admin archive project error:', error)
    res.status(500).json({ message: 'Failed to archive project' })
  }
}

exports.restoreAdminProjectRecord = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    project.lifecycleStage = req.body.lifecycleStage || 'idea'
    await project.save()
    await logAdminAction({ adminUser: adminId(req), action: 'restore_project_record', targetType: 'project', targetId: id, details: { lifecycleStage: project.lifecycleStage } })
    res.json({ project })
  } catch (error) {
    console.error('Admin restore project error:', error)
    res.status(500).json({ message: 'Failed to restore project' })
  }
}

exports.permanentlyRemoveAdminProjectRecord = async (req, res) => {
  try {
    const { id } = req.params
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid project id' })
    if (req.body?.confirm !== 'PERMANENTLY_DELETE_PROJECT') {
      return res.status(400).json({ message: 'Confirmation required' })
    }
    const project = await Project.findByIdAndDelete(id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    await logAdminAction({ adminUser: adminId(req), action: 'permanently_remove_project_record', targetType: 'project', targetId: id, details: { title: project.title } })
    res.json({ message: 'Project permanently removed' })
  } catch (error) {
    console.error('Admin permanent project removal error:', error)
    res.status(500).json({ message: 'Failed to remove project' })
  }
}
