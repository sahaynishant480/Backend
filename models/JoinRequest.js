const mongoose = require('mongoose')

const JoinRequestSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true })

module.exports = mongoose.model('JoinRequest', JoinRequestSchema)
