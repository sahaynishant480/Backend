const mongoose = require('mongoose')

const ProjectAccessLogSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessType: {
    type: String,
    enum: ['project_view', 'validation_view', 'package_download', 'admin_access'],
    required: true,
    index: true
  },
  metadata: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: false })

ProjectAccessLogSchema.index({ project: 1, timestamp: -1 })

module.exports = mongoose.model('ProjectAccessLog', ProjectAccessLogSchema)
