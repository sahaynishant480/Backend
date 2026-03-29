const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['join_request', 'join_accepted', 'join_rejected', 'validation_feedback', 'mention', 'project_featured', 'team_full']
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead: { type: Boolean, default: false },
  actionRequired: { type: Boolean, default: false },
  actionUrl: { type: String }
}, { timestamps: true })

// Indexes for performance
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', NotificationSchema)
