const mongoose = require('mongoose')

const JudgingCriteriaSchema = new mongoose.Schema({
  stage: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonStage', required: true, index: true },
  criteriaName: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', trim: true, maxlength: 3000 },
  maximumMarks: { type: Number, default: 0, min: 0 },
  weightage: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true })

JudgingCriteriaSchema.index({ stage: 1, criteriaName: 1 })

module.exports = mongoose.model('JudgingCriteria', JudgingCriteriaSchema)
