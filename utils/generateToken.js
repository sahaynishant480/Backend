const jwt = require('jsonwebtoken')

function generateToken(payload, secret, options) {
  return jwt.sign(payload, secret, options)
}

module.exports = generateToken
