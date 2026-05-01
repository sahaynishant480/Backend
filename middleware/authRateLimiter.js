const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const { getRedisClient } = require('../config/redisClient')

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function createAuthAttemptLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: MAX_ATTEMPTS,
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    passOnStoreError: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip, 56),
    store: new RedisStore({
      sendCommand: (...args) => getRedisClient().sendCommand(args),
      prefix: 'rl:auth:'
    }),
    handler: (req, res, _next, options) => {
      const retryAfterSeconds = req.rateLimit?.resetTime
        ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(WINDOW_MS / 1000)

      res.set('Retry-After', String(retryAfterSeconds))

      return res.status(options.statusCode).json({
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: retryAfterSeconds
      })
    }
  })
}

module.exports = {
  createAuthAttemptLimiter
}
