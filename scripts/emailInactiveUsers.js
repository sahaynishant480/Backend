require('../config/loadEnv')
const mongoose = require('mongoose')
const User = require('../models/User')
const { sendEmail } = require('../services/emailService')

const HOURS = Number(process.env.INACTIVE_HOURS || 48)
const LIMIT = Number(process.env.LIMIT || 0)
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true'
const INCLUDE_ADMINS = String(process.env.INCLUDE_ADMINS || 'false').toLowerCase() === 'true'
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.joincollab.org').replace(/\/$/, '')
const UNSUBSCRIBE_URL = (process.env.UNSUBSCRIBE_URL || `${FRONTEND_URL}/unsubscribe`).trim()

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing. Set it in .env or pass it inline.')
    process.exit(1)
  }

  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000)

  await mongoose.connect(process.env.MONGO_URI)

  const query = {
    email: { $exists: true, $ne: '' },
    $or: [
      { lastActive: { $lt: cutoff } },
      { lastActive: { $exists: false } }
    ]
  }

  if (!INCLUDE_ADMINS) {
    query.role = { $ne: 'admin' }
  }

  let cursor = User.find(query).select('name email lastActive role')
  if (LIMIT > 0) cursor = cursor.limit(LIMIT)

  const users = await cursor
  console.log(`Found ${users.length} inactive users (>${HOURS} hours).`) 

  if (DRY_RUN) {
    console.log('DRY_RUN enabled. No emails sent.')
    await mongoose.disconnect()
    return
  }

  let sent = 0
  let failed = 0

  for (const user of users) {
    const name = user.name || 'there'
    const loginUrl = `${FRONTEND_URL}/login`

    const subject = 'Action required: Please log in within 24 hours'
    const text = `Hi ${name},\n\nWe noticed you haven't logged in recently. Please log in within the next 24 hours to keep your account active, as per our Terms & Conditions.\n\nLogin here: ${loginUrl}\n\nTo stop receiving these emails, visit: ${UNSUBSCRIBE_URL}\n\n— Collab Team`

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <p>Hi ${name},</p>
        <p>We noticed you haven't logged in recently. Please log in within the next <strong>24 hours</strong> to keep your account active, as per our Terms & Conditions.</p>
        <p><a href="${loginUrl}" style="color:#6C63FF;">Log in to Collab</a></p>
        <p style="margin-top:16px; font-size:12px; color:#6b7280;">If you don’t want these reminders, you can <a href="${UNSUBSCRIBE_URL}" style="color:#6b7280;">unsubscribe here</a>.</p>
        <p style="color:#6b7280;">— Collab Team</p>
      </div>
    `

    try {
      await sendEmail({
        to: user.email,
        subject,
        text,
        html
      })
      sent += 1
    } catch (err) {
      failed += 1
      console.error(`Failed for ${user.email}:`, err.message || err)
    }
  }

  console.log(`Done. Sent: ${sent}, Failed: ${failed}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
