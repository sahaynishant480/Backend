const express = require('express')
const router = express.Router()
const { seedColleges, getAllColleges, searchColleges } = require('../services/collegeService')

// Seed colleges (for initial setup)
router.post('/seed', async (req, res) => {
  try {
    await seedColleges()
    res.json({ message: 'Colleges seeded successfully' })
  } catch (error) {
    console.error('Seed colleges error:', error)
    res.status(500).json({ message: 'Failed to seed colleges' })
  }
})

// Get all colleges (default)
router.get('/', async (req, res) => {
  try {
    const colleges = await getAllColleges()
    res.json(colleges)
  } catch (error) {
    console.error('Get colleges error:', error)
    res.status(500).json({ message: 'Failed to fetch colleges' })
  }
})

// Get all colleges for dropdown
router.get('/all', async (req, res) => {
  try {
    const colleges = await getAllColleges()
    res.json(colleges)
  } catch (error) {
    console.error('Get colleges error:', error)
    res.status(500).json({ message: 'Failed to fetch colleges' })
  }
})

// Search colleges
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' })
    }
    
    const colleges = await searchColleges(query)
    res.json(colleges)
  } catch (error) {
    console.error('Search colleges error:', error)
    res.status(500).json({ message: 'Failed to search colleges' })
  }
})

module.exports = router
