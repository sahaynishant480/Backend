const mongoose = require('mongoose')

const CollegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Engineering', 'Management', 'Law', 'Medical', 'Other'],
    default: 'Other'
  }
}, { timestamps: true })

module.exports = mongoose.model('College', CollegeSchema)
