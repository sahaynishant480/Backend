const Opportunity = require('../models/Opportunity')

exports.getOpportunities = async (req, res) => {
  try {
    const { type } = req.query
    const filter = { isActive: true }
    if (type && type !== 'all') filter.type = type
    const opportunities = await Opportunity.find(filter).sort({ createdAt: -1 })
    res.json({ opportunities })
  } catch (error) {
    console.error('Get opportunities error:', error)
    res.status(500).json({ message: 'Failed to fetch opportunities' })
  }
}

exports.createOpportunity = async (req, res) => {
  try {
    const { type, title, description, organization, applyLink, deadline, prize, amount, location } = req.body
    if (!type || !title) return res.status(400).json({ message: 'Type and title are required' })
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
