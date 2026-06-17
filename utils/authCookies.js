const jwtConfig = require('../config/jwt')

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const configuredDomain = process.env.COOKIE_DOMAIN?.trim()
  const cookieDomain = configuredDomain?.includes('qzz.io') ? '.joincollab.org' : configuredDomain
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: jwtConfig.cookieMaxAgeMs,
    path: '/'
  }
  if (cookieDomain) {
    options.domain = cookieDomain
  }
  return options
}

const setAuthCookie = (res, token) => {
  res.cookie('accessToken', token, getCookieOptions())
}

const clearAuthCookie = (res) => {
  const options = getCookieOptions()
  res.clearCookie('accessToken', { ...options, maxAge: 0 })
}

module.exports = {
  setAuthCookie,
  clearAuthCookie
}
