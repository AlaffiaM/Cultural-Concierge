# Culture Concierge — Backend

Express REST API with MongoDB (Mongoose), Clerk JWT auth, and automated scrapers.

## Stack

- **Express 5** — HTTP server
- **Mongoose 9** — MongoDB ODM
- **Clerk SDK** — JWT verification
- **Helmet** — security headers
- **express-rate-limit** — rate limiting
- **Axios** — HTTP client (scrapers, Gemini API)
- **Jest + Supertest** — testing

## Scripts

| Command | Description |
|---|---|
| `npm start` | Production (node src/server.js) |
| `npm run dev` | Development (nodemon, auto-restart) |
| `npm test` | Run Jest tests |

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/api/venues` | List venues (paginated, filterable by city) |
| GET | `/api/venues/:city` | Venues by city |
| GET | `/api/venues/vibes/:city` | Vibe-matched venue search |
| GET | `/api/venues/upcoming/:city` | Venues with upcoming approved events |
| GET | `/api/events` | List events (filterable by city, ghost, pillar) |
| GET | `/api/events/upcoming` | Upcoming approved events |
| GET | `/api/events/today` | Events happening today |
| GET | `/api/advisories/:city` | Travel advisory for a city |
| POST | `/api/subscribe` | Email newsletter signup |

### Admin (requires Clerk JWT + admin email)
| Method | Path | Description |
|---|---|---|
| POST/PUT/DELETE | `/api/venues/:id` | CRUD venues |
| POST/PUT/DELETE | `/api/events/:id` | CRUD events |
| PUT | `/api/events/:id/approve` | Approve a single event |
| POST | `/api/events/deduplicate` | Find and remove duplicate events |
| POST | `/api/scraper/run` | Run event scrapers |
| POST | `/api/venues/scraper/run` | Run venue scrapers (gemini, wikipedia) |
| POST | `/api/venues/scraper/accept` | Accept scraped venues |
| POST | `/api/venues/batch-enrich` | Fetch Wikipedia images for venues |
| POST | `/api/advisories/run` | Generate travel advisories via Gemini |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/export/*` | CSV exports |
| GET/POST | `/api/scraper/history` | Recent scraped events |

## Scrapers

Each scraper module exports `{ scrape, SOURCE }`. Event scrapers run through `scrapers/index.js` (which handles dedup + rejection + upsert). Venue scrapers run through `routes/venues.js` (which handles dedup + insert separately).

## Project Structure

```
src/
├── app.js               Express app (middleware, routes, static)
├── server.js            Entry point (dotenv, DB connect, listen)
├── config/              db, clerk, cloudinary config
├── controllers/         Route handlers (admin, event, venue, ...)
├── middleware/          auth, admin, errorHandler, rateLimiter
├── models/              Mongoose schemas (Venue, Event, CityAdvisory, Email, User)
├── routes/              Express route modules
├── scrapers/            Scraper modules (event, venue, advisor)
├── services/            clerk, scraper, email, ai services
└── utils/               Sanitizers, image processor, travel brief updater
tests/                   Jest test suites
```
