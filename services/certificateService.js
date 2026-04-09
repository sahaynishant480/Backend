const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return '—'
  }
}

const buildVerificationUrl = (certificateId) => {
  const apiBase = process.env.PUBLIC_API_BASE || 'https://api.collab.qzz.io'
  return `${apiBase.replace(/\/$/, '')}/api/public/certificates/${certificateId}`
}

const generateCertificatePdf = async ({ userName, projectTitle, collegeName, issuedAt, certificateId }) => {
  const uploadsRoot = path.join(__dirname, '..', 'uploads')
  const certificatesDir = path.join(uploadsRoot, 'certificates')
  ensureDir(certificatesDir)

  const filename = `validation-certificate-${certificateId}.pdf`
  const filePath = path.join(certificatesDir, filename)

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const contentX = 60
    const contentWidth = pageWidth - 120

    const centerText = (text, y, size, font = 'Times-Roman', color = '#111827') => {
      doc.font(font).fontSize(size).fillColor(color)
      doc.text(text, contentX, y, { width: contentWidth, align: 'center' })
    }

    const templatePath = path.join(__dirname, '..', 'assets', 'certificate-template.png')
    if (fs.existsSync(templatePath)) {
      doc.image(templatePath, 0, 0, { fit: [pageWidth, pageHeight], align: 'center', valign: 'center' })
    } else {
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(2).stroke('#6C5CE7')
    }

    let y = pageHeight * 0.35
    centerText('This certifies that', y, 14)
    y += 40
    centerText(userName, y, 34, 'Times-Italic')

    const lineWidth = pageWidth * 0.45
    const lineY = y + 40
    doc
      .moveTo((pageWidth - lineWidth) / 2, lineY)
      .lineTo((pageWidth + lineWidth) / 2, lineY)
      .lineWidth(1.5)
      .strokeColor('#111827')
      .stroke()

    y = lineY + 18
    centerText('is actively working on the project', y, 13)
    y += 30
    centerText(`"${projectTitle}"`, y, 16, 'Times-Italic')
    y += 30
    centerText(`which has entered the Validation phase on ${formatDate(issuedAt)}.`, y, 12)
    y += 28

    if (collegeName) {
      centerText(`College: ${collegeName}`, y, 12)
    }

    const footerY = pageHeight * 0.88
    centerText(`Certificate ID: ${certificateId}`, footerY, 9, 'Times-Roman', '#374151')
    centerText(`Verify: ${buildVerificationUrl(certificateId)}`, footerY + 16, 9, 'Times-Roman', '#374151')

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  return {
    filename,
    relativePath: `/uploads/certificates/${filename}`,
    certificateId
  }
}

const generateValidationCertificates = async ({ project, members }) => {
  const issuedAt = new Date()
  const certificates = []

  for (const member of members) {
    const certificateId = crypto.randomUUID()
    const result = await generateCertificatePdf({
      userName: member.name || 'Team Member',
      projectTitle: project.title,
      collegeName: project.college?.name,
      issuedAt,
      certificateId
    })
    certificates.push({
      certificateId,
      user: member._id || member.id || member,
      url: result.relativePath,
      filename: result.filename,
      issuedAt
    })
  }

  return certificates
}

module.exports = {
  generateValidationCertificates,
  buildVerificationUrl
}
