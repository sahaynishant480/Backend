const mongoose = require('mongoose')

const AuthorSnapshotSchema = new mongoose.Schema({
  id: String,
  name: { type: String, default: 'Builder' },
  role: { type: String, default: 'Startup Builder' },
  skills: [{ type: String }],
  venture: { type: String, default: '' },
  email: String
}, { _id: false })

const FeedCommentSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  author: AuthorSnapshotSchema,
  content: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true })

const FeedPostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['milestone', 'blocker'],
    required: true,
    index: true
  },
  authorId: { type: String, required: true, index: true },
  author: AuthorSnapshotSchema,
  venture: { type: String, default: '' },
  projectTitle: { type: String, default: '' },
  source: {
    type: { type: String, default: '' },
    projectId: { type: String, default: '' },
    milestoneId: { type: String, default: '' }
  },
  content: { type: String, required: true, maxlength: 2000 },
  media: { type: String, default: null },
  likedBy: [{ type: String }],
  dislikedBy: [{ type: String }],
  comments: [FeedCommentSchema]
}, { timestamps: true })

FeedPostSchema.index({ createdAt: -1 })

module.exports = mongoose.model('FeedPost', FeedPostSchema)
