const mongoose = require('mongoose')

const JudgeReviewSchema = new mongoose.Schema({
  hackathon: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  stage: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonStage', required: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonRegistration', required: true, index: true },
  judge: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  criteriaScores: [{
    criteria: { type: mongoose.Schema.Types.ObjectId, ref: 'JudgingCriteria', required: true },
    obtainedMarks: { type: Number, default: 0, min: 0 }
  }],
  totalObtainedMarks: { type: Number, default: 0, min: 0 },
  maximumPossibleMarks: { type: Number, default: 0, min: 0 },
  feedback: { type: String, default: '', trim: true, maxlength: 5000 },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true })

JudgeReviewSchema.index({ hackathon: 1, stage: 1, registration: 1, judge: 1 }, { unique: true })

module.exports = mongoose.model('JudgeReview', JudgeReviewSchema)
