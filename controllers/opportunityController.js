const Opportunity = require('../models/Opportunity')
const Hackathon = require('../models/Hackathon')
const HackathonRegistration = require('../models/HackathonRegistration')
const HackathonAnnouncement = require('../models/HackathonAnnouncement')
const Project = require('../models/Project')

const publicHackathonQuery = { status: { $in: ['published', 'active'] }, visibility: 'public' }
const mapHackathonOpportunity = (hackathon) => ({
  _id: `hackathon:${hackathon._id}`,
  sourceId: hackathon._id,
  sourceType: 'hackathon',
  type: 'hackathon',
  title: hackathon.title,
  description: hackathon.description,
  organization: hackathon.organizer,
  deadline: hackathon.endDate,
  prize: (hackathon.prizes || []).join(', '),
  applyLink: hackathon.rules || '',
  status: hackathon.status,
  createdAt: hackathon.createdAt
})

exports.getOpportunities = async (req, res) => {
  try {
    const { type } = req.query
    const filter = { isActive: true }
    if (type && type !== 'all') filter.type = type
    const [opportunities, hackathons] = await Promise.all([
      type === 'hackathon' ? [] : Opportunity.find(filter).sort({ createdAt: -1 }).lean(),
      (!type || type === 'all' || type === 'hackathon') ? Hackathon.find(publicHackathonQuery).sort({ createdAt: -1 }).lean() : []
    ])
    res.json({ opportunities: [...opportunities, ...hackathons.map(mapHackathonOpportunity)].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) })
  } catch (error) {
    console.error('Get opportunities error:', error)
    res.status(500).json({ message: 'Failed to fetch opportunities' })
  }
}

exports.registerHackathonProject = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id
    const { projectId } = req.body
    const [hackathon, project] = await Promise.all([
      Hackathon.findOne({ _id: req.params.id, ...publicHackathonQuery }),
      Project.findById(projectId).select('owner teamMembers')
    ])
    if (!hackathon) return res.status(404).json({ message: 'Hackathon not available for registration' })
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (project.owner?.toString() !== userId?.toString()) return res.status(403).json({ message: 'Only the project owner can register this project' })
    const registeredUsers = [project.owner, ...(project.teamMembers || [])].filter(Boolean)
    const registration = await HackathonRegistration.findOneAndUpdate(
      { hackathon: hackathon._id, project: project._id },
      { hackathon: hackathon._id, project: project._id, registeredUsers, registrationStatus: 'pending', submittedAt: new Date() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    res.status(201).json({ registration })
  } catch (error) {
    console.error('Register hackathon project error:', error)
    res.status(500).json({ message: 'Failed to register project' })
  }
}

exports.createOpportunity = async (req, res) => {
  try {
    const { type, title, description, organization, applyLink, deadline, prize, amount, location } = req.body
    if (!type || !title) return res.status(400).json({ message: 'Type and title are required' })
    if (type === 'hackathon') {
      const hackathon = await Hackathon.create({
        title,
        description,
        organizer: organization,
        rules: applyLink,
        endDate: deadline ? new Date(deadline) : undefined,
        prizes: prize || amount ? [prize || amount] : [],
        status: 'published',
        visibility: 'public'
      })
      return res.status(201).json({ opportunity: mapHackathonOpportunity(hackathon) })
    }
    const opportunity = await Opportunity.create({
      type, title, description, organization, applyLink,
      deadline: deadline ? new Date(deadline) : undefined,
      prize, amount, location, createdBy: req.user.userId
    })
    res.status(201).json({ opportunity })
  } catch (error) {
    console.error('Create opportunity error:', error)
    res.status(500).json({ message: 'Failed to create opportunity' })
  }
}

exports.getHackathonPublicDetails = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id
    const hackathon = await Hackathon.findOne({ _id: req.params.id, status: { $in: ['active', 'completed'] }, visibility: 'public' }).lean()
    if (!hackathon) return res.status(404).json({ message: 'Hackathon is not active yet' })
    const registration = await HackathonRegistration.findOne({ hackathon: hackathon._id, registeredUsers: userId }).populate('project', 'title').lean()
    if (!registration) return res.status(403).json({ message: 'Only registered teams can open this hackathon workspace' })
    const announcements = await HackathonAnnouncement.find({ hackathon: hackathon._id }).sort({ createdAt: -1 }).lean()
    res.json({ hackathon, registration, announcements })
  } catch (error) {
    console.error('Get public hackathon detail error:', error)
    res.status(500).json({ message: 'Failed to open hackathon' })
  }
}

exports.updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    if (updates.deadline) updates.deadline = new Date(updates.deadline)
    const opportunity = await Opportunity.findByIdAndUpdate(id, updates, { new: true })
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' })
    res.json({ opportunity })
  } catch (error) {
    console.error('Update opportunity error:', error)
    res.status(500).json({ message: 'Failed to update opportunity' })
  }
}

exports.deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params
    await Opportunity.findByIdAndDelete(id)
    res.json({ message: 'Opportunity deleted' })
  } catch (error) {
    console.error('Delete opportunity error:', error)
    res.status(500).json({ message: 'Failed to delete opportunity' })
  }
}
