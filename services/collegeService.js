const College = require('../models/College')

const seedList = [
  { name: 'KCC Institute Of Technology and Management', type: 'Engineering' },
  { name: 'KCC Institute Of Legal and Higher Education', type: 'Law' },
  { name: 'Others', type: 'Other' }
]

const normalizeName = (name) => name.trim()

// Seed initial colleges
const seedColleges = async () => {
  try {
    for (const entry of seedList) {
      const name = normalizeName(entry.name)
      await College.updateOne(
        { name: new RegExp(`^${name}$`, 'i') },
        { $setOnInsert: { name, type: entry.type } },
        { upsert: true }
      )
    }

    return await College.find({}).sort({ name: 1 })
  } catch (error) {
    console.error('Seed colleges error:', error)
    throw error
  }
}

// Get all colleges for frontend dropdown
const getAllColleges = async () => {
  try {
    return await College.find({}).sort({ name: 1 })
  } catch (error) {
    console.error('Get colleges error:', error)
    throw error
  }
}

// Search colleges
const searchColleges = async (query) => {
  try {
    return await College.find({ 
      name: { $regex: query, $options: 'i' }
    }).sort({ name: 1 })
  } catch (error) {
    console.error('Search colleges error:', error)
    throw error
  }
}

module.exports = {
  seedColleges,
  getAllColleges,
  searchColleges
}
