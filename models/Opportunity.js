const mongoose = require('mongoose')

const opportunitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['incubator', 'grant', 'hackathon', 'achievement'],
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  organization: { type: String, trim: true, default: '' },
  applyLink: { type: String, trim: true, default: '' },
  deadline: { type: Date },
  prize: { type: String, trim: true, default: '' },
  amount: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Opportunity', opportunitySchema)
