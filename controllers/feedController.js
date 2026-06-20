const FeedPost = require('../models/FeedPost')
const User = require('../models/User')
const Project = require('../models/Project')

const sanitizeText = (value, max = 2000) => (
  typeof value === 'string' ? value.trim().slice(0, max) : ''
)

const buildAuthorSnapshot = async (userId, venture) => {
  const user = await User.findById(userId).select('name email role skills primaryCategory')
  return {
    id: String(userId),
    name: user?.name || 'Builder',
    role: user?.role === 'admin' ? 'Admin · Builder' : 'Startup Builder',
    skills: Array.isArray(user?.skills) ? user.skills : [],
    venture: venture || user?.primaryCategory || '',
    email: undefined
  }
}

const serializePost = (post) => {
  const likedBy = post.likedBy || []
  const dislikedBy = post.dislikedBy || []
  return {
    id: String(post._id),
    _id: post._id,
    type: post.type,
    authorId: post.authorId,
    author: post.author,
    venture: post.venture,
    projectTitle: post.projectTitle,
    source: post.source || {},
    content: post.content,
    media: post.media || null,
    createdAt: post.createdAt,
    likes: likedBy.length,
    dislikes: dislikedBy.length,
    likedBy,
    dislikedBy,
    comments: (post.comments || []).map((comment) => ({
      id: String(comment._id),
      authorId: comment.authorId,
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt
    }))
  }
}

exports.getFeedPosts = async (req, res) => {
  try {
    const posts = await FeedPost.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    res.json({ posts: posts.map(serializePost) })
  } catch (error) {
    console.error('Get feed posts error:', error)
    res.status(500).json({ message: 'Failed to load feed posts' })
  }
}

exports.createFeedPost = async (req, res) => {
  try {
    const type = sanitizeText(req.body.type, 40)
    const content = sanitizeText(req.body.content)
    const venture = sanitizeText(req.body.venture || req.body.projectTitle, 160)
    const projectTitle = sanitizeText(req.body.projectTitle || venture, 160)
    const media = typeof req.body.media === 'string' ? req.body.media : null
    const source = req.body.source && typeof req.body.source === 'object' ? {
      type: sanitizeText(req.body.source.type, 40),
      projectId: sanitizeText(req.body.source.projectId, 80),
      milestoneId: sanitizeText(req.body.source.milestoneId, 80)
    } : undefined

    if (!['milestone', 'blocker'].includes(type)) {
      return res.status(400).json({ message: 'Post type must be milestone or blocker' })
    }

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' })
    }

    const author = await buildAuthorSnapshot(req.user.userId, venture)
    const post = await FeedPost.create({
      type,
      authorId: String(req.user.userId),
      author,
      venture,
      projectTitle,
      ...(source ? { source } : {}),
      content,
      media
    })

    res.status(201).json({ post: serializePost(post.toObject()) })
  } catch (error) {
    console.error('Create feed post error:', error)
    res.status(500).json({ message: 'Failed to create feed post' })
  }
}

exports.deleteMilestoneFeedPost = async (req, res) => {
  try {
    const projectId = sanitizeText(req.body.projectId, 80)
    const milestoneId = sanitizeText(req.body.milestoneId, 80)
    const milestoneTitle = sanitizeText(req.body.milestoneTitle, 300)
    if (!projectId || !milestoneId) return res.status(400).json({ message: 'Project and milestone are required' })

    const project = await Project.findById(projectId).select('title owner teamMembers')
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const userId = String(req.user.userId)
    const isMember = String(project.owner) === userId || (project.teamMembers || []).some((id) => String(id) === userId)
    if (!isMember && req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' })

    const fallbackContent = milestoneTitle ? `Achieved milestone: ${milestoneTitle}` : ''
    await FeedPost.deleteMany({
      type: 'milestone',
      $or: [
        { 'source.type': 'milestone', 'source.projectId': projectId, 'source.milestoneId': milestoneId },
        ...(fallbackContent ? [{ projectTitle: project.title, content: fallbackContent }] : [])
      ]
    })
    res.json({ message: 'Milestone activity removed' })
  } catch (error) {
    console.error('Delete milestone feed post error:', error)
    res.status(500).json({ message: 'Failed to remove milestone activity' })
  }
}

exports.voteFeedPost = async (req, res) => {
  try {
    const voteType = sanitizeText(req.body.voteType, 20)
    const userId = String(req.user.userId)
    const post = await FeedPost.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Feed post not found' })

    const hadLike = (post.likedBy || []).includes(userId)
    const hadDislike = (post.dislikedBy || []).includes(userId)
    post.likedBy = (post.likedBy || []).filter((id) => id !== userId)
    post.dislikedBy = (post.dislikedBy || []).filter((id) => id !== userId)

    if (voteType === 'like' && !hadLike) post.likedBy.push(userId)
    if (voteType === 'dislike' && !hadDislike) post.dislikedBy.push(userId)

    await post.save()
    res.json({ post: serializePost(post.toObject()) })
  } catch (error) {
    console.error('Vote feed post error:', error)
    res.status(500).json({ message: 'Failed to vote on feed post' })
  }
}

exports.commentFeedPost = async (req, res) => {
  try {
    const content = sanitizeText(req.body.content, 1000)
    if (!content) return res.status(400).json({ message: 'Comment is required' })

    const post = await FeedPost.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Feed post not found' })

    const author = await buildAuthorSnapshot(req.user.userId, post.venture)
    post.comments.push({
      authorId: String(req.user.userId),
      author,
      content
    })

    await post.save()
    res.status(201).json({ post: serializePost(post.toObject()) })
  } catch (error) {
    console.error('Comment feed post error:', error)
    res.status(500).json({ message: 'Failed to comment on feed post' })
  }
}

exports.deleteFeedPost = async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Feed post not found' })

    const userId = String(req.user.userId)
    if (post.authorId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own feed posts' })
    }

    await post.deleteOne()
    res.json({ message: 'Feed post deleted' })
  } catch (error) {
    console.error('Delete feed post error:', error)
    res.status(500).json({ message: 'Failed to delete feed post' })
  }
}
