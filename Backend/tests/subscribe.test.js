const request = require('supertest')
const express = require('express')

jest.mock('../src/models/Email', () => {
  const Email = jest.fn(() => ({}))
  Email.findOne = jest.fn()
  Email.create = jest.fn()
  return Email
})

const Email = require('../src/models/Email')
const { createSubscribeLimiter } = require('../src/middleware/rateLimiter')
const subscribeRoutes = require('../src/routes/subscribeRoutes')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/subscribe', subscribeRoutes)
  return app
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/subscribe', () => {
  it('returns 400 for an invalid email', async () => {
    const res = await request(buildApp()).post('/api/subscribe').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('valid email')
    expect(Email.create).not.toHaveBeenCalled()
  })

  it('returns 201 and normalizes a new subscription', async () => {
    Email.findOne.mockResolvedValue(null)
    Email.create.mockResolvedValue({})
    const res = await request(buildApp()).post('/api/subscribe').send({
      email: '  Foo@Example.COM ',
      name: ' Foo Bar ',
      source: 'newsletter',
    })
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(true)
    expect(Email.create).toHaveBeenCalledWith({
      email: 'foo@example.com',
      name: 'Foo Bar',
      source: 'newsletter',
    })
  })

  it('defaults an unknown source to newsletter', async () => {
    Email.findOne.mockResolvedValue(null)
    Email.create.mockResolvedValue({})
    await request(buildApp()).post('/api/subscribe').send({ email: 'a@b.com', source: 'spam' })
    expect(Email.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'newsletter' }))
  })

  it('returns 200 (created: false) when the email already exists', async () => {
    Email.findOne.mockResolvedValue({ email: 'dup@example.com' })
    const res = await request(buildApp()).post('/api/subscribe').send({ email: 'dup@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.created).toBe(false)
    expect(Email.create).not.toHaveBeenCalled()
  })
})

describe('subscribe rate limit', () => {
  it('returns 429 after 5 attempts in the window', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/subscribe', createSubscribeLimiter(), subscribeRoutes)

    // All 5 allowed requests (2 valid, rest invalid — every request counts).
    Email.findOne.mockResolvedValue(null)
    Email.create.mockResolvedValue({})
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/subscribe').send({ email: `user${i}@example.com` })
      expect([200, 201]).toContain(res.status)
    }
    const blocked = await request(app).post('/api/subscribe').send({ email: 'blocked@example.com' })
    expect(blocked.status).toBe(429)
  })
})
