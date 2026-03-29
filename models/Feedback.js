const mongoose = require('mongoose')

const FeedbackSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String
}, { timestamps: true })

module.exports = mongoose.model('Feedback', FeedbackSchema)
