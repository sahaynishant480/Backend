const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Task', TaskSchema)
