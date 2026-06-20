const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Project = require('../models/Project')
const Milestone = require('../models/Milestone')
const ContributionLog = require('../models/ContributionLog')
const User = require('../models/User')
const AdminActionLog = require('../models/AdminActionLog')
const ProjectAccessLog = require('../models/ProjectAccessLog')
const { logAdminAction } = require('../services/adminActionLogger')

const uploadsDir = path.join(__dirname, '..', 'uploads')
const isId = (id) => mongoose.Types.ObjectId.isValid(id)
const ids = (list = []) => list.map((value) => (value?._id || value).toString())
const requireId = (id, res, label = 'Invalid id') => {
  if (isId(id)) return true
  res.status(400).json({ message: label })
  return false
}
const adminId = (req) => req.user?._id || req.user?.userId
const log = (req, action, targetType, targetId, details = {}) =>
  logAdminAction({ adminUser: adminId(req), action, targetType, targetId, details })

exports.adminStats = (req, res) => res.status(501).send('Not implemented')

exports.getAdminLogs = async (req, res) => {
  const [adminLogs, projectAccessLogs] = await Promise.all([
    AdminActionLog.find({})
      .populate('adminUser', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean(),
    ProjectAccessLog.find({})
      .populate('project', 'title')
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean()
  ])
  res.json({ adminLogs, projectAccessLogs })
}

exports.getAdminProjects = async (req, res) => {
  const projects = await Project.find({})
    .select('title category owner teamMembers lifecycleStage readinessScore visibility createdAt updatedAt')
    .populate('owner', 'name email')
    .populate('teamMembers', 'name email')
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean()
  res.json({ projects })
}

exports.getAdminProjectDetails = async (req, res) => {
  if (!requireId(req.params.id, res)) return
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('teamMembers', 'name email')
    .populate('files.uploadedBy', 'name email')
    .populate('validation.sharedFiles.uploadedBy', 'name email')
    .lean()
  if (!project) return res.status(404).json({ message: 'Project not found' })
  const milestones = await Milestone.find({ projectId: project._id })
    .populate('owner', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean()
  res.json({ project, milestones })
}

exports.updateAdminProject = async (req, res) => {
  if (!requireId(req.params.id, res)) return
  const allowed = ['title', 'shortPitch', 'description', 'category', 'tags', 'rolesNeeded', 'skillsRequired', 'numberOfTeammates', 'visibility', 'lifecycleStage', 'readinessScore']
  const project = await Project.findById(req.params.id)
  if (!project) return res.status(404).json({ message: 'Project not found' })
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field]
  })
  await project.save()
  await log(req, 'update_project', 'project', project._id, { fields: Object.keys(req.body || {}) })
  res.json({ project })
}

exports.archiveAdminProject = async (req, res) => {
  if (!requireId(req.params.id, res)) return
  const project = await Project.findById(req.params.id)
  if (!project) return res.status(404).json({ message: 'Project not found' })
  project.lifecycleStage = 'archived'
  await project.save()
  await log(req, 'archive_project', 'project', project._id)
  res.json({ project })
}

exports.deleteAdminProject = async (req, res) => {
  if (!requireId(req.params.id, res)) return
  const project = await Project.findByIdAndDelete(req.params.id)
  if (!project) return res.status(404).json({ message: 'Project not found' })
  await Promise.all([
    Milestone.deleteMany({ projectId: project._id }),
    ContributionLog.deleteMany({ projectId: project._id })
  ])
  await log(req, 'delete_project', 'project', project._id, { title: project.title })
  res.json({ message: 'Project deleted' })
}

exports.addAdminTeamMember = async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  if (!requireId(id, res) || !requireId(userId, res, 'Invalid user id')) return
  const [project, user] = await Promise.all([Project.findById(id), User.findById(userId)])
  if (!project) return res.status(404).json({ message: 'Project not found' })
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (project.owner.toString() !== userId && !ids(project.teamMembers).includes(userId)) project.teamMembers.push(userId)
  await project.save()
  await log(req, 'add_team_member', 'project', project._id, { userId })
  res.json({ project })
}

exports.removeAdminTeamMember = async (req, res) => {
  const { id, userId } = req.params
  if (!requireId(id, res) || !requireId(userId, res, 'Invalid user id')) return
  const project = await Project.findById(id)
  if (!project) return res.status(404).json({ message: 'Project not found' })
  project.teamMembers = project.teamMembers.filter((member) => (member?._id || member).toString() !== userId)
  await project.save()
  await log(req, 'remove_team_member', 'project', project._id, { userId })
  res.json({ project })
}

exports.changeAdminProjectOwner = async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  if (!requireId(id, res) || !requireId(userId, res, 'Invalid user id')) return
  const [project, user] = await Promise.all([Project.findById(id), User.findById(userId)])
  if (!project) return res.status(404).json({ message: 'Project not found' })
  if (!user) return res.status(404).json({ message: 'User not found' })
  const oldOwner = project.owner.toString()
  if (oldOwner !== userId && !ids(project.teamMembers).includes(oldOwner)) project.teamMembers.push(oldOwner)
  project.owner = userId
  project.teamMembers = project.teamMembers.filter((member) => (member?._id || member).toString() !== userId)
  await project.save()
  await log(req, 'change_project_owner', 'project', project._id, { oldOwner, newOwner: userId })
  res.json({ project })
}

exports.updateAdminMilestone = async (req, res) => {
  if (!requireId(req.params.milestoneId, res)) return
  const allowed = ['title', 'description', 'owner', 'lifecycleStage', 'dueDate', 'dependencies', 'blockers', 'blockerDetails', 'status', 'priority']
  const milestone = await Milestone.findOne({ _id: req.params.milestoneId, projectId: req.params.id })
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) milestone[field] = req.body[field]
  })
  if (milestone.status === 'completed' && !milestone.completedAt) milestone.completedAt = new Date()
  await milestone.save()
  await log(req, 'update_milestone', 'milestone', milestone._id, { projectId: req.params.id })
  res.json({ milestone })
}

exports.deleteAdminMilestone = async (req, res) => {
  if (!requireId(req.params.milestoneId, res)) return
  const milestone = await Milestone.findOneAndDelete({ _id: req.params.milestoneId, projectId: req.params.id })
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
  await ContributionLog.deleteMany({ milestoneId: milestone._id })
  await log(req, 'delete_milestone', 'milestone', milestone._id, { projectId: req.params.id })
  res.json({ message: 'Milestone deleted' })
}

exports.deleteAdminBlocker = async (req, res) => {
  const milestone = await Milestone.findOne({ _id: req.params.milestoneId, projectId: req.params.id })
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' })
  const { blockerId } = req.params
  milestone.blockerDetails = (milestone.blockerDetails || []).filter((b) => b.blockerId !== blockerId)
  const index = Number(blockerId)
  if (Number.isInteger(index) && index >= 0) milestone.blockers.splice(index, 1)
  await milestone.save()
  await log(req, 'delete_blocker', 'milestone', milestone._id, { projectId: req.params.id, blockerId })
  res.json({ milestone })
}

exports.deleteAdminProjectFile = async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) return res.status(404).json({ message: 'Project not found' })
  const file = (project.files || []).find((item) => item._id?.toString() === req.params.fileId || item.filename === req.params.fileId)
  if (!file) return res.status(404).json({ message: 'File not found' })
  project.files = project.files.filter((item) => item !== file)
  project.validation.sharedFiles = (project.validation.sharedFiles || []).filter((item) => item.filename !== file.filename)
  await project.save()
  fs.promises.unlink(path.join(uploadsDir, path.basename(file.filename))).catch(() => {})
  await log(req, 'delete_project_file', 'project', project._id, { fileId: req.params.fileId, filename: file.filename })
  res.json({ message: 'File deleted' })
}
