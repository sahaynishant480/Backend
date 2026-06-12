const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')

const TEMPLATE_DIR = path.join(__dirname, '..', 'assets', 'templates')
const INCLUDE_LEGACY_PACKAGE_DOCUMENTS = false

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const createZipBuffer = (entries = []) => {
  const localParts = []
  const centralParts = []
  let offset = 0

  entries.forEach(({ name, data }) => {
    const fileData = Buffer.isBuffer(data) ? data : Buffer.from(String(data || ''))
    const fileName = Buffer.from(name)
    const crc = crc32(fileData)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(fileData.length, 18)
    local.writeUInt32LE(fileData.length, 22)
    local.writeUInt16LE(fileName.length, 26)
    local.writeUInt16LE(0, 28)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(fileData.length, 20)
    central.writeUInt32LE(fileData.length, 24)
    central.writeUInt16LE(fileName.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)

    localParts.push(local, fileName, fileData)
    centralParts.push(central, fileName)
    offset += local.length + fileName.length + fileData.length
  })

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

const textValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value || 'Not provided')
}

const createPdfBuffer = (title, sections = [], templateFile = '') => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))
  doc.on('end', () => resolve(Buffer.concat(chunks)))
  doc.on('error', reject)

  if (templateFile) {
    const templatePath = path.join(TEMPLATE_DIR, templateFile)
    if (fs.existsSync(templatePath)) {
      doc.image(templatePath, 0, 0, { fit: [doc.page.width, doc.page.height] })
    }
  }

  doc.fontSize(20).fillColor('#111827').text(title, { underline: false })
  doc.moveDown(0.75)

  sections.forEach((section) => {
    doc.fontSize(13).fillColor('#111827').text(section.heading, { bold: true })
    doc.moveDown(0.25)
    doc.fontSize(10).fillColor('#374151').text(textValue(section.body), {
      lineGap: 3
    })
    doc.moveDown(0.8)
  })

  doc.end()
})

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const slideXml = (title, body) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="685800"/><a:ext cx="7772400" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="3200" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="1828800"/><a:ext cx="7772400" cy="3657600"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1800"/><a:t>${escapeXml(body)}</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`

const createPitchDeckBuffer = (packet = {}) => {
  const slides = [
    ['Startup Overview', `${packet.summary?.startupName || 'Startup'}\n${packet.summary?.whyThisMatters || ''}`],
    ['Problem & Users', `${packet.summary?.problemStatement || ''}\nTarget users: ${packet.summary?.targetUsers || ''}`],
    ['Validation & MVP', `Stage: ${packet.summary?.currentStage || ''}\nEvidence: ${packet.readinessSignals?.evidenceCount || 0}\nUploaded assets: ${packet.readinessSignals?.uploadedAssets || 0}`]
  ]

  return createZipBuffer([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
    { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500" type="screen4x3"/></p:presentation>` },
    { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slides.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>` },
    ...slides.map(([title, body], i) => ({ name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(title, body) }))
  ])
}
const getTeamMembers = (packet = {}) => {
  const members = Array.isArray(packet.teamDetails) ? packet.teamDetails : [
    packet.teamDetails?.founder,
    ...(packet.teamDetails?.members || [])
  ].filter(Boolean)
  const seen = new Set()
  return members.filter((member) => {
    const key = String(member.id || member._id || member.email || member.name || '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const generateTemplatePdf = (title, templateFile, sections = []) => createPdfBuffer(title, sections, templateFile)

const generateStartupIdentityCardPdf = (packet = {}) => generateTemplatePdf('Startup Identity Card', 'startup_identity_card.png', [
  { heading: 'Startup Name', body: packet.summary?.startupName },
  { heading: 'Tagline', body: packet.summary?.tagline },
  { heading: 'Category', body: packet.summary?.category },
  { heading: 'Readiness Score', body: `${packet.readinessScore || 0}%` },
  { heading: 'Stage', body: packet.stage?.label },
  { heading: 'Founder', body: packet.summary?.founderName || packet.teamDetails?.founder?.name },
  { heading: 'Team Member Count', body: getTeamMembers(packet).length },
  { heading: 'Elevator Pitch', body: packet.summary?.elevatorPitch || packet.summary?.whyThisMatters },
  { heading: 'Problem Statement', body: packet.summary?.problemStatement }
])

const generateProblemStatementPdf = (packet = {}) => generateTemplatePdf('Problem Statement Brief', 'problem_statement.png', [
  { heading: 'Startup Name', body: packet.summary?.startupName },
  { heading: 'Problem Statement', body: packet.summary?.problemStatement }
])

const generateTeamRosterPdf = (packet = {}) => generateTemplatePdf('Team Roster', 'team_roster.png', getTeamMembers(packet).map((member, index) => ({
  heading: `${index + 1}. ${member.name || 'Team Member'}`,
  body: {
    email: member.email || 'Not provided',
    role: member.role || 'Team Member'
  }
})))

const generateIncubationApplicationPdf = (packet = {}) => generateTemplatePdf('Incubation Application', 'incubation_application_cover.png', [
  { heading: 'Startup Name', body: packet.summary?.startupName },
  { heading: 'Tagline', body: packet.summary?.tagline },
  { heading: 'Category', body: packet.summary?.category },
  { heading: 'Stage', body: packet.stage?.label },
  { heading: 'Readiness Score', body: `${packet.readinessScore || 0}%` },
  { heading: 'Founder Name', body: packet.summary?.founderName || packet.teamDetails?.founder?.name },
  { heading: 'Date Generated', body: packet.generatedAt }
])

const createStartupPackageZip = async (packet = {}) => {
  const validationAnswers = packet.validationReport?.questions
    ?.map((item) => `${item.question}\n${item.answer || 'Not answered'}`)
    .join('\n\n')

  const entries = [
    {
      name: 'documents/Startup_Identity_Card.pdf',
      data: await generateStartupIdentityCardPdf(packet)
    },
    {
      name: 'documents/Problem_Statement_Brief.pdf',
      data: await generateProblemStatementPdf(packet)
    },
    {
      name: 'documents/Team_Roster.pdf',
      data: await generateTeamRosterPdf(packet)
    },
    {
      name: 'documents/Incubation_Application.pdf',
      data: await generateIncubationApplicationPdf(packet)
    },
    ...(INCLUDE_LEGACY_PACKAGE_DOCUMENTS ? [
    { name: 'documents/pitch_deck.pptx', data: createPitchDeckBuffer(packet) },
    {
      name: 'documents/validation_report.pdf',
      data: await createPdfBuffer('Validation Report', [
        { heading: 'Status', body: packet.validationReport?.status },
        { heading: 'Self-conducted validation answers', body: validationAnswers },
        { heading: 'Evidence count', body: packet.readinessSignals?.evidenceCount }
      ])
    },
    {
      name: 'documents/executive_summary.pdf',
      data: await createPdfBuffer('Executive Summary', [
        { heading: 'Startup overview', body: packet.summary },
        { heading: 'Final incubation notes', body: packet.incubationAssets?.startupOverview || packet.incubationAssets?.executiveSummary },
        { heading: 'Current stage', body: packet.stage?.label },
        { heading: 'Readiness score', body: `${packet.readinessScore || 0}%` }
      ])
    },
    {
      name: 'documents/execution_report.pdf',
      data: await createPdfBuffer('Execution Sprint Report', [
        { heading: 'Milestone history', body: packet.milestoneHistory },
        { heading: 'Execution timeline', body: packet.executionTimeline },
        { heading: 'Readiness signals', body: packet.readinessSignals }
      ])
    },
    {
      name: 'documents/identity_brief.json',
      data: JSON.stringify({
        startup: packet.summary,
        team: packet.teamDetails,
        generatedAt: packet.generatedAt,
        stage: packet.stage
      }, null, 2)
    },
    {
      name: 'documents/feedback_report.pdf',
      data: await createPdfBuffer('Feedback Artifact', [
        { heading: 'Validation feedback', body: validationAnswers },
        { heading: 'Demo notes', body: packet.prototypeShowcase?.demoNotes },
        { heading: 'Demo link', body: packet.prototypeShowcase?.demoLink },
        { heading: 'Pitch deck links', body: packet.incubationAssets?.pitchDeckLinks },
        { heading: 'Demo video links', body: packet.incubationAssets?.demoVideoLinks }
      ])
    }
    ] : [])
  ]

  return createZipBuffer(entries)
}

module.exports = {
  createStartupPackageZip,
  createZipBuffer,
  generateIncubationApplicationPdf,
  generateProblemStatementPdf,
  generateStartupIdentityCardPdf,
  generateTeamRosterPdf
}
