const User = require('../models/User')
const Project = require('../models/Project')
const Certificate = require('../models/Certificate')
const { createCertificateHash } = require('../services/certificateService')

const verifyCertificateRecord = (record = {}) => {
  if (!record.verificationHash || !record.verificationTimestamp) return { valid: false, expectedHash: '' }
  const expectedHash = createCertificateHash({
    memberName: record.userName,
    role: record.role,
    startupName: record.startupName || record.projectTitle,
    projectId: record.project?._id || record.project,
    timestamp: record.verificationTimestamp
  })
  return { valid: expectedHash === record.verificationHash, expectedHash }
}

exports.getPublicStats = async (req, res) => {
  try {
    const windowDays = 30
    const activeSince = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

    const [activeUsers, totalProjects] = await Promise.all([
      User.countDocuments({ lastActive: { $gte: activeSince } }),
      Project.countDocuments({ lifecycleStage: { $ne: 'archived' } })
    ])

    res.json({
      stats: {
        activeUsers,
        totalProjects,
        activeUsersWindowDays: windowDays
      }
    })
  } catch (error) {
    console.error('Public stats error:', error)
    res.status(500).json({ message: 'Failed to load stats' })
  }
}

exports.getCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params
    if (!certificateId) {
      return res.status(400).json({ message: 'Certificate id is required' })
    }

    const certificate = await Certificate.findOne({ certificateId })
      .populate('user', 'name')
      .populate('project', 'title')
      .populate('college', 'name')

    if (certificate) {
      const apiBase = (process.env.PUBLIC_API_BASE || 'https://api.collab.qzz.io').replace(/\/$/, '')
      const downloadUrl = `${apiBase}${certificate.url}`
      const verification = verifyCertificateRecord(certificate)
      return res.json({
        valid: verification.valid,
        certificate: {
          certificateId: certificate.certificateId,
          issuedAt: certificate.issuedAt,
          downloadUrl,
          role: certificate.role,
          startupName: certificate.startupName || certificate.projectTitle,
          projectStatus: certificate.projectStatus,
          verificationHash: certificate.verificationHash,
          verificationUrl: certificate.verificationUrl,
          user: certificate.user ? {
            id: certificate.user._id || certificate.user,
            name: certificate.user.name || certificate.userName || 'Team Member'
          } : undefined,
          project: certificate.project ? {
            id: certificate.project._id || certificate.project,
            title: certificate.project.title || certificate.projectTitle
          } : {
            id: certificate.project,
            title: certificate.projectTitle
          },
          college: certificate.college?.name || certificate.collegeName || null
        }
      })
    }

    const project = await Project.findOne({
      'validation.certificates.certificateId': certificateId
    })
      .populate('validation.certificates.user', 'name')
      .populate('college', 'name')

    if (!project || !project.validation?.certificates) {
      return res.status(404).json({ message: 'Certificate not found' })
    }

    const cert = project.validation.certificates.find(
      (item) => item.certificateId === certificateId
    )

    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' })
    }

    const apiBase = (process.env.PUBLIC_API_BASE || 'https://api.collab.qzz.io').replace(/\/$/, '')
    const downloadUrl = `${apiBase}${cert.url}`
    const certRecord = cert.toObject?.() || cert
    const verification = verifyCertificateRecord({
      ...certRecord,
      project: project._id,
      projectTitle: project.title,
      startupName: cert.startupName || project.title
    })

    res.json({
      valid: verification.valid,
      certificate: {
        certificateId: cert.certificateId,
        issuedAt: cert.issuedAt,
        downloadUrl,
        role: cert.role,
        startupName: cert.startupName || project.title,
        verificationHash: cert.verificationHash,
        verificationUrl: cert.verificationUrl,
        user: cert.user ? {
          id: cert.user._id || cert.user,
          name: cert.user.name || 'Team Member'
        } : undefined,
        project: {
          id: project._id,
          title: project.title
        },
        college: project.college?.name || null
      }
    })
  } catch (error) {
    console.error('Public certificate error:', error)
    res.status(500).json({ message: 'Failed to load certificate' })
  }
}
