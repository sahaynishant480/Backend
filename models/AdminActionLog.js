const mongoose = require('mongoose')

const AdminActionLogSchema = new mongoose.Schema({
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
    index: true
  },
  targetId: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
})

AdminActionLogSchema.index({ adminUser: 1, timestamp: -1 })
AdminActionLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 })

module.exports = mongoose.model('AdminActionLog', AdminActionLogSchema)
