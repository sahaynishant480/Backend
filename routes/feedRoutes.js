const express = require('express')
const {
  getFeedPosts,
  createFeedPost,
  voteFeedPost,
  commentFeedPost
} = require('../controllers/feedController')

const router = express.Router()

router.get('/posts', getFeedPosts)
router.post('/posts', createFeedPost)
router.post('/posts/:id/vote', voteFeedPost)
router.post('/posts/:id/comments', commentFeedPost)

module.exports = router
