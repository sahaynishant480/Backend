const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

function generateStartupDocuments(data, outputPath) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0
  })

  doc.pipe(fs.createWriteStream(outputPath))

  const startupTemplate = path.join(
    __dirname,
    '../assets/templates/startup_identity_card.png'
  )

  doc.image(startupTemplate, 0, 0, {
    width: 595,
    height: 842
  })
  doc.fillColor('#FFFFFF')

doc.fontSize(30)
doc.text(data.startupName || '', 70, 190)

doc.fontSize(16)
doc.text(data.tagline || '', 70, 240)

doc.fontSize(12)
doc.text(data.category || '', 70, 290)

doc.fontSize(12)
doc.text(
  data.elevatorPitch || '',
  70,
  340,
  {
    width: 450
  }
)

doc.fontSize(11)
doc.text(
  (data.descriptorWords || []).join(' • '),
  70,
  430
)

  doc.end()

  return outputPath
}

module.exports = {
  generateStartupDocuments
}