const request = require('supertest')
const express = require('express')

jest.mock('../src/services/clerkService', () => ({
  verifyClerkToken: jest.fn(),
}))

const { verifyClerkToken } = require('../src/services/clerkService')
const { requireAdmin } = require('../src/middleware/admin')

beforeAll(() => {
  process.env.ADMIN_EMAILS = 'admin@alaffia.com'
})

afterAll(() => {
  delete process.env.ADMIN_EMAILS
})

function buildApp() {
  const app = express()
  app.use(express.json())
  app.get('/test-admin', requireAdmin, (req, res) => res.json({ ok: true }))
  app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message })
  })
  return app
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('requireAdmin middleware', () => {
  it('returns 401 when no Authorization header', async () => {
    const app = buildApp()
    const res = await request(app).get('/test-admin')
    expect(res.status).toBe(401)
    expect(res.body.message).toContain('authorization')
  })

  it('returns 401 when token verification fails', async () => {
    verifyClerkToken.mockRejectedValue(new Error('Invalid token'))
    const app = buildApp()
    const res = await request(app).get('/test-admin').set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(401)
  })

  it('returns 403 when token is valid but email is not admin', async () => {
    verifyClerkToken.mockResolvedValue({ email: 'user@gmail.com' })
    const app = buildApp()
    const res = await request(app).get('/test-admin').set('Authorization', 'Bearer valid-token')
    expect(res.status).toBe(403)
    expect(res.body.message).toContain('admin')
  })

  it('returns 200 when token is valid and email is admin', async () => {
    verifyClerkToken.mockResolvedValue({ email: 'admin@alaffia.com' })
    const app = buildApp()
    const res = await request(app).get('/test-admin').set('Authorization', 'Bearer valid-token')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
