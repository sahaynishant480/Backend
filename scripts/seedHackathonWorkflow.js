require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Project = require('../models/Project')
const Hackathon = require('../models/Hackathon')
const HackathonRegistration = require('../models/HackathonRegistration')
const HackathonStage = require('../models/HackathonStage')
const JudgingCriteria = require('../models/JudgingCriteria')
const JudgeReview = require('../models/JudgeReview')
const HackathonSubmission = require('../models/HackathonSubmission')

const run = async () => {
  if (process.env.CONFIRM_HACKATHON_SEED !== 'true') throw new Error('Set CONFIRM_HACKATHON_SEED=true to seed hackathon test data.')
  await mongoose.connect(process.env.MONGODB_URI)
  const password = await bcrypt.hash('TestUser123!', 10)
  const users = await Promise.all(Array.from({ length: 5 }, (_, i) => User.findOneAndUpdate(
    { email: `hackathon.test${i + 1}@joincollab.org` },
    { name: `Hackathon Test User ${i + 1}`, email: `hackathon.test${i + 1}@joincollab.org`, password, role: i === 0 ? 'admin' : 'user', emailVerified: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )))
  const hackathon = await Hackathon.findOneAndUpdate(
    { title: 'Seeded Public Hackathon' },
    { title: 'Seeded Public Hackathon', description: 'End-to-end hackathon workflow seed.', organizer: 'Collab', status: 'published', visibility: 'public', startDate: new Date(), endDate: new Date(Date.now() + 7 * 864e5) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  const projects = await Promise.all([0, 1, 2].map((i) => Project.findOneAndUpdate(
    { title: `Seeded Startup ${i + 1}` },
    { title: `Seeded Startup ${i + 1}`, shortPitch: 'Seeded pitch', description: 'Seeded project for hackathon testing.', category: 'Tech & Product', numberOfTeammates: 3, executionPlan: 'Build, validate, demo.', owner: users[i + 1]._id, teamMembers: [users[(i + 2) % users.length]._id], visibility: 'global' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )))
  const stage = await HackathonStage.findOneAndUpdate({ hackathon: hackathon._id, stageName: 'Final Evaluation' }, { hackathon: hackathon._id, stageName: 'Final Evaluation', order: 1, maximumMarks: 100, status: 'active' }, { upsert: true, new: true })
  const names = ['Innovation', 'Execution', 'Market Potential', 'Presentation', 'Team Capability']
  const criteria = await Promise.all(names.map((criteriaName) => JudgingCriteria.findOneAndUpdate({ stage: stage._id, criteriaName }, { stage: stage._id, criteriaName, maximumMarks: 20, weightage: 20 }, { upsert: true, new: true })))
  const scoreSets = [[17, 18, 20, 15, 19], [15, 16, 18, 14, 17], [12, 15, 16, 13, 14]]
  for (let i = 0; i < projects.length; i++) {
    const registration = await HackathonRegistration.findOneAndUpdate({ hackathon: hackathon._id, project: projects[i]._id }, { hackathon: hackathon._id, project: projects[i]._id, registeredUsers: [projects[i].owner, ...projects[i].teamMembers], registrationStatus: 'approved' }, { upsert: true, new: true })
    await HackathonSubmission.findOneAndUpdate({ hackathon: hackathon._id, registration: registration._id }, { hackathon: hackathon._id, registration: registration._id, project: projects[i]._id, demoLink: 'https://example.com/demo', githubLink: 'https://github.com/example/demo', submissionStatus: 'submitted' }, { upsert: true, new: true })
    await JudgeReview.findOneAndUpdate({ hackathon: hackathon._id, stage: stage._id, registration: registration._id, judge: users[0]._id }, { hackathon: hackathon._id, stage: stage._id, registration: registration._id, judge: users[0]._id, criteriaScores: criteria.map((c, idx) => ({ criteria: c._id, obtainedMarks: scoreSets[i][idx] })), totalObtainedMarks: scoreSets[i].reduce((a, b) => a + b, 0), maximumPossibleMarks: 100, feedback: 'Seeded review' }, { upsert: true, new: true })
  }
  console.log(`Seeded hackathon ${hackathon._id}`)
  await mongoose.disconnect()
}

run().catch((error) => { console.error(error); process.exit(1) })
