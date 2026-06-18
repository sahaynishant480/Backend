const mongoose = require('mongoose')

const HackathonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: '', trim: true, maxlength: 5000 },
  organizer: { type: String, default: '', trim: true, maxlength: 180 },
  startDate: { type: Date },
  endDate: { type: Date },
  rules: { type: String, default: '', trim: true, maxlength: 8000 },
  eligibility: { type: String, default: '', trim: true, maxlength: 3000 },
  themes: [{ type: String, trim: true, maxlength: 120 }],
  prizes: [{ type: String, trim: true, maxlength: 180 }],
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['private', 'college', 'public'],
    default: 'private',
    index: true
  },
  phase: {
    type: String,
    enum: ['REGISTRATIONS_OPEN', 'REGISTRATIONS_CLOSED', 'HACKATHON_OPEN', 'HACKATHON_CLOSED'],
    default: 'REGISTRATIONS_OPEN',
    index: true
  }
}, { timestamps: true })

HackathonSchema.index({ startDate: 1, status: 1 })

module.exports = mongoose.model('Hackathon', HackathonSchema)
