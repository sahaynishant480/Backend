const { createClient } = require('redis')

let redisClient = null

async function initRedis() {
  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('REDIS_URL is required')
  }

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10000),
      reconnectStrategy: (retries) => Math.min(3000, 100 + retries * 100)
    }
  })

  redisClient.on('error', (err) => {
    console.error('[redis] client error:', err.message)
  })

  redisClient.on('reconnecting', () => {
    console.warn('[redis] reconnecting...')
  })

  await redisClient.connect()
  await redisClient.ping()
  console.log('[redis] connected')

  return redisClient
}

function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client is not connected')
  }

  return redisClient
}

async function closeRedis() {
  if (!redisClient) return

  try {
    if (typeof redisClient.close === 'function') {
      await redisClient.close() // node-redis v5+
    } else {
      await redisClient.quit() // node-redis v4 fallback
    }
  } catch (err) {
    console.error('[redis] close error:', err.message)
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis
}
