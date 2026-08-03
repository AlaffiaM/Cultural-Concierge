# Culture Concierge — Backend

Express REST API with MongoDB (Mongoose), Clerk JWT auth, and automated scrapers. Serves the built frontend from `Frontend/dist` in production.

## Stack

- **Express 5** — HTTP server
- **Mongoose 9** — MongoDB ODM
- **Clerk SDK** — JWT verification
- **Helmet** — security headers
- **express-rate-limit** — rate limiting
- **Axios** — HTTP client (scrapers, Gemini API)
- **Puppeteer** — headless Chrome (Mookh scraper)
- **Jest + Supertest** — testing

## Scripts

| Command | Description |
|---|---|
| `npm start` | Production (`node src/server.js`) |
| `npm run dev` | Development (nodemon, auto-restart) |
| `npm test` | Run Jest tests |
| `postinstall` | Installs Puppeteer Chrome into `PUPPETEER_CACHE_DIR` |

## Project Structure

```
src/
├── app.js                Express app: helmet, HTTPS redirect, CORS, rate limits, route mounting, static frontend
├── server.js             Entry point (dotenv, DB connect, cleanup job, listen)
├── config/               db.js (Mongo + hourly past-event cleanup), clerk.js, cloudinary.js
├── controllers/          Route handlers (event, venue, admin, system, ai, scraper, upload, subscribe, advisory)
├── middleware/           auth.js (Clerk JWT), admin.js (ADMIN_EMAILS allowlist), rateLimiter, errorHandler
├── models/               Mongoose schemas: Event, Venue, CityAdvisory, Email
├── routes/               Express route modules (all mounted in app.js)
├── scrapers/             Event scrapers (ticketsasa, kenyabuzz, mookh, eventbrite), venue scrapers (gemini, wikipedia), advisors-gemini
├── services/             clerkService (JWT verify + email resolution), scraperService, emailService, aiService
└── utils/                sanitize.js (escapeRegex), imageProcessor.js (Cloudinary), travelBriefUpdater.js
tests/                    Jest test suites
```

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/api/venues` | List venues (paginated, filterable by city, pillar) |
| GET | `/api/venues/:city` | Venues by city |
| GET | `/api/venues/vibes/:city` | Vibe-matched venue search |
| GET | `/api/venues/upcoming/:city` | Venues with upcoming approved events |
| GET | `/api/events` | List events (filter by city, pillar, ghost, `search` keyword) |
| GET | `/api/events/upcoming` | Upcoming approved events (city-filterable) |
| GET | `/api/events/today` | Events happening today |
| GET | `/api/events/:id` | Single event |
| GET | `/api/advisories/:city` | Travel advisory for a city |
| POST | `/api/subscribe` | Email newsletter signup |
| GET | `/api/status` | Deploy status (clerk configured, node env) |

### Admin (requires `Authorization: Bearer <Clerk JWT>` + email in `ADMIN_EMAILS`)
| Method | Path | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/events` , `/api/events/:id` | CRUD events |
| PUT | `/api/events/:id/approve` | Approve a draft event (→ `status: approved`) |
| GET | `/api/events/pending` | Draft events awaiting review (`?city=`, `?ghost=`) |
| GET | `/api/events/ghosts` | Pop-up (ghost location) events |
| POST | `/api/events/deduplicate` | Remove duplicate events |
| POST/PUT/DELETE | `/api/venues/:id` | CRUD venues |
| POST | `/api/venues/scraper/run` | Run venue scrapers (`gemini` / `wikipedia`) |
| POST | `/api/venues/scraper/accept` | Accept scraped venues |
| POST | `/api/venues/batch-enrich` | Fetch Wikipedia images for venues |
| GET | `/api/venues/lookup` | Look up a single venue image |
| POST | `/api/scraper/run` | Run event scrapers (ticketsasa, kenyabuzz, mookh, eventbrite) |
| GET | `/api/scraper/history` | Recently scraped events |
| POST | `/api/scraper/approve` | Approve multiple scraped events |
| POST | `/api/advisories/run` | Generate travel advisories via Gemini |
| POST | `/api/ai/suggest-tags` | Gemini-powered tag suggestions for an event |
| POST | `/api/uploads` | Upload an image (Cloudinary) |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/tags` | Tag taxonomy from the database |
| GET | `/api/admin/export/*` | CSV exports (events, venues, subscribers) |
| GET | `/api/admin/subscribers` | Subscriber list |
| DELETE | `/api/admin/scraped-events` | Delete all scraped draft events |
| GET | `/api/system/health` | Key/config status (Gemini, Clerk) |
| GET | `/api/system/admin-emails` | Configured admin email list |

## Auth Flow

1. Frontend `adminFetch()` attaches `Authorization: Bearer <token>` (Clerk session token).
2. `middleware/auth.js` verifies the JWT with the Clerk secret key and resolves the user email (`services/clerkService.js`, with a 5-min cache).
3. `middleware/admin.js` compares the email against `ADMIN_EMAILS`; non-matches get `403`.
4. `middleware/admin.js` sets `req.adminUser` for downstream handlers.

## Scrapers

- **Event scrapers** (`ticketsasa`, `kenyabuzz`, `mookh`, `eventbrite`) each export `{ scrape, SOURCE }` and run through `scrapers/index.js`, which handles fuzzy dedup, rejection terms, and upsert into `Event` as `status: "draft"`, `isGhostLocation: true`.
- **Venue scrapers** (`venues-gemini`, `venues-wikipedia`) are loaded dynamically by `venueController.runVenueScraper` from the `source` body field (`gemini` / `wikipedia`), inserting venues with `status: "scraped"`.
- **Advisory scraper** (`advisors-gemini`) generates a `CityAdvisory` per city via Gemini.
- **Mookh** requires headless Chrome; Puppeteer's cache dir must point at `PUPPETEER_CACHE_DIR` (see `render.yaml`) so `ensureChrome()` finds the installed binary.

## Data Model Notes

- `Event`: `status` is `draft` (awaiting approval) or `approved` (live). `isGhostLocation: true` marks pop-ups without a linked venue; `linkedSpotId` links an event to a `Venue`.
- `Venue`: `status` is `scraped`, `inactive`, or `active`. `pillar` is `CULTURE` / `WELLNESS` / `SOCIAL`; `vibeTags` drive the vibe search.
- A cleanup job in `config/db.js` deletes past-dated events every hour.

## Env Vars

See `.env.example`. Required: `MONGO_URI`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `ADMIN_EMAILS`. Optional: `CLOUDINARY_*`, `CLIENT_ORIGIN`, `GEMINI_MODEL`, `PUPPETEER_CACHE_DIR`, `PORT`.
