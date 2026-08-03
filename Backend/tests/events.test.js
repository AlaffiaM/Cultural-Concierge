const request = require('supertest')
const express = require('express')

jest.mock('../src/services/clerkService', () => ({
  verifyClerkToken: jest.fn(),
}))

// Chainable thenable query builder: Event.find(...).sort(...).limit(...) awaits to `value`.
const chainable = (value) => {
  const chain = {
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
    finally: (cb) => Promise.resolve(value).finally(cb),
  }
  for (const m of ['sort', 'skip', 'limit', 'populate', 'select', 'lean', 'collation']) {
    chain[m] = jest.fn(() => chain)
  }
  return chain
}

jest.mock('../src/models/Event', () => {
  const Event = jest.fn((doc) => ({ ...doc, save: jest.fn() }))
  Event.find = jest.fn(() => chainable([]))
  Event.findOne = jest.fn(() => chainable(null))
  Event.findById = jest.fn(() => chainable(null))
  Event.findByIdAndUpdate = jest.fn(() => chainable(null))
  Event.findByIdAndDelete = jest.fn(() => chainable(null))
  Event.findOneAndUpdate = jest.fn(() => chainable(null))
  Event.create = jest.fn(() => chainable(null))
  Event.countDocuments = jest.fn(() => chainable(0))
  return Event
})

const { verifyClerkToken } = require('../src/services/clerkService')
const Event = require('../src/models/Event')
const eventRoutes = require('../src/routes/eventRoutes')

beforeAll(() => {
  process.env.ADMIN_EMAILS = 'admin@alaffia.com'
})

afterAll(() => {
  delete process.env.ADMIN_EMAILS
})

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/events', eventRoutes)
  return app
}

beforeEach(() => {
  jest.clearAllMocks()
  Event.find.mockReturnValue(chainable([]))
  Event.findOne.mockReturnValue(chainable(null))
  Event.findById.mockReturnValue(chainable(null))
  Event.findByIdAndUpdate.mockReturnValue(chainable(null))
  Event.findByIdAndDelete.mockReturnValue(chainable(null))
  Event.countDocuments.mockReturnValue(chainable(0))
})

const authed = () => verifyClerkToken.mockResolvedValue({ email: 'admin@alaffia.com' })

describe('GET /api/events (public list)', () => {
  it('returns paginated events', async () => {
    Event.find.mockReturnValue(chainable([{ _id: 'e1', name: 'Afro Night' }]))
    Event.countDocuments.mockReturnValue(chainable(1))
    const res = await request(buildApp()).get('/api/events')
    expect(res.status).toBe(200)
    expect(res.body.events).toHaveLength(1)
    expect(res.body.total).toBe(1)
    expect(res.body.totalPages).toBe(1)
  })

  it('only lists approved events by default', async () => {
    await request(buildApp()).get('/api/events')
    expect(Event.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }))
  })

  it('passes city, pillar, ghost and search to the query', async () => {
    await request(buildApp()).get('/api/events?city=Lagos&pillar=WELLNESS&ghost=true&search=gallery')
    const filter = Event.find.mock.calls[0][0]
    expect(filter.city).toEqual(expect.objectContaining({ $options: 'i' }))
    expect(filter.pillar).toEqual(expect.objectContaining({ $options: 'i' }))
    expect(filter.isGhostLocation).toBe(true)
    expect(filter.$or).toBeDefined()
  })

  it('escapes regex metacharacters in the search term', async () => {
    await request(buildApp()).get('/api/events?search=foo.[*')
    const orClauses = Event.find.mock.calls[0][0].$or
    for (const clause of orClauses) {
      const regex = Object.values(clause)[0].$regex
      expect(regex).toBe('foo\\.\\[\\*')
    }
  })
})

describe('admin-guarded event routes', () => {
  const authedRequest = (app) => (method, url) =>
    request(app)[method](url).set('Authorization', 'Bearer test-token')

  it('returns 401 without a token', async () => {
    const res = await request(buildApp()).get('/api/events/pending')
    expect(res.status).toBe(401)
  })

  it('GET /api/events/pending filters by city and ghost', async () => {
    authed()
    Event.find.mockReturnValue(chainable([{ _id: 'p1' }]))
    await authedRequest(buildApp())('get', '/api/events/pending?city=Abuja&ghost=false')
    const filter = Event.find.mock.calls[0][0]
    expect(filter.status).toBe('draft')
    expect(filter.city).toEqual(expect.objectContaining({ $options: 'i' }))
    expect(filter.isGhostLocation).toEqual({ $ne: true })
  })

  it('POST /api/events creates an approved event', async () => {
    authed()
    const saved = { _id: 'e9', name: 'New Event', status: 'approved', save: jest.fn().mockResolvedValue({}) }
    Event.mockReturnValue(saved)
    const res = await authedRequest(buildApp())('post', '/api/events').send({ name: 'New Event', city: 'Lagos', date: '2026-08-10' })
    expect(res.status).toBe(201)
    expect(saved.save).toHaveBeenCalled()
  })

  it('PUT /api/events/:id/approve sets status to approved', async () => {
    authed()
    Event.findByIdAndUpdate.mockReturnValue(chainable({ _id: 'e1', status: 'approved' }))
    const res = await authedRequest(buildApp())('put', '/api/events/e1/approve')
    expect(res.status).toBe(200)
    expect(Event.findByIdAndUpdate).toHaveBeenCalledWith(
      'e1',
      { status: 'approved' },
      { returnDocument: 'after' }
    )
  })

  it('PUT /api/events/:id/approve returns 404 when missing', async () => {
    authed()
    Event.findByIdAndUpdate.mockReturnValue(chainable(null))
    const res = await authedRequest(buildApp())('put', '/api/events/missing/approve')
    expect(res.status).toBe(404)
  })

  it('DELETE /api/events/:id deletes the event', async () => {
    authed()
    Event.findByIdAndDelete.mockReturnValue(chainable({ _id: 'e1' }))
    const res = await authedRequest(buildApp())('delete', '/api/events/e1')
    expect(res.status).toBe(200)
    expect(Event.findByIdAndDelete).toHaveBeenCalledWith('e1')
  })
})
