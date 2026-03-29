const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
  resetPasswordOTP: String,
  resetPasswordExpires: Date,
  college: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
  college_id: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
  course: { type: String, required: false },
  yearOfStudy: { type: String, required: false },
  skills: [{ type: String, required: false }],
  primaryCategory: { type: String, required: false },
  phone: { type: String, required: false, trim: true },
  points: { type: Number, default: 0 },
  badges: [{ type: String, required: false }],
  projectsCreated: { type: Number, default: 0 },
  projectsJoined: { type: Number, default: 0 },
  projectsCompleted: { type: Number, default: 0 },
  validationsGiven: { type: Number, default: 0 },
  helpfulFeedback: { type: Number, default: 0 },
  inactivePenalties: { type: Number, default: 0 },
  showContactToTeam: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)
