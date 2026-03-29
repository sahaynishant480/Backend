const nodemailer = require('nodemailer')

const getTransporter = async () => {
  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS
  } = process.env

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set to send emails')
  }

  if (EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    })
  }

  const host = EMAIL_HOST || 'smtp.gmail.com'
  const port = Number(EMAIL_PORT || 587)

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  })
}

exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await getTransporter()
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER

    const info = await transporter.sendMail({
      from: `Collab <${fromAddress}>`,
      to,
      subject,
      text,
      html
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email service error:', error)
    throw error
  }
}
