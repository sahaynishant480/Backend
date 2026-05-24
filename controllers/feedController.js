const FeedPost = require('../models/FeedPost')
const User = require('../models/User')

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
      content,
      media
    })

    res.status(201).json({ post: serializePost(post.toObject()) })
  } catch (error) {
    console.error('Create feed post error:', error)
    res.status(500).json({ message: 'Failed to create feed post' })
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
