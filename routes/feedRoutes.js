const express = require('express')
const {
  getFeedPosts,
  createFeedPost,
  voteFeedPost,
  commentFeedPost,
  deleteFeedPost
} = require('../controllers/feedController')

const router = express.Router()

router.get('/posts', getFeedPosts)
router.post('/posts', createFeedPost)
router.post('/posts/:id/vote', voteFeedPost)
router.post('/posts/:id/comments', commentFeedPost)
router.delete('/posts/:id', deleteFeedPost)

module.exports = router
