const mongoose = require('mongoose')

const HackathonRegistrationSchema = new mongoose.Schema({
  hackathon: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  registrationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true
  },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true })

HackathonRegistrationSchema.index({ hackathon: 1, project: 1 }, { unique: true })

module.exports = mongoose.model('HackathonRegistration', HackathonRegistrationSchema)
