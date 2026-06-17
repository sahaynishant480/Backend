const mongoose = require('mongoose')

const HackathonSubmissionSchema = new mongoose.Schema({
  hackathon: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonRegistration', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  demoLink: { type: String, default: '', trim: true },
  githubLink: { type: String, default: '', trim: true },
  pitchDeck: { type: String, default: '', trim: true },
  uploadedFiles: [{
    originalName: String,
    filename: String,
    mimetype: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  details: { type: String, default: '', trim: true },
  submissionStatus: { type: String, enum: ['draft', 'submitted', 'under_review', 'accepted', 'rejected'], default: 'submitted', index: true },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true })

HackathonSubmissionSchema.index({ hackathon: 1, registration: 1 }, { unique: true })

module.exports = mongoose.model('HackathonSubmission', HackathonSubmissionSchema)
