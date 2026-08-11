# Culture Concierge

AI-powered cultural discovery platform for African cities — Lagos, Abuja, Nairobi, and Kigali. Discovers venues, events, and travel advisories via automated scrapers and Gemini, presented in a mobile-first web app with a full admin CMS.

## Architecture

```
├── Backend/           Express + Mongoose API (port 5000)
│   ├── src/app.js     Express app: security, CORS, rate limits, route mounting
│   ├── src/server.js  Entry point (dotenv, DB connect, listen)
│   ├── src/config/    db, clerk, cloudinary config
│   ├── src/controllers/  Route handlers (events, venues, admin, ai, system, ...)
│   ├── src/middleware/   Clerk JWT auth, admin guard, rate limiter, error handling
│   ├── src/models/    Mongoose schemas (Event, Venue, CityAdvisory, Email)
│   ├── src/routes/    Express route modules (mounted in app.js)
│   ├── src/scrapers/  Event + venue + advisory importers
│   ├── src/services/  clerk, scraper, email, ai services
│   ├── src/utils/     Sanitizers, image processor, travel brief updater
│   └── render.yaml    Render deploy config (builds frontend + installs Chrome)
│
└── Frontend/          React + Vite SPA (port 5173)
    └── src/
        ├── admin/     CMS dashboard (events, venues, scrapers, settings, ...)
        ├── lib/       API base URL + Clerk token helper
        └── *.jsx      Public pages (Cities, Venues, Happenings, Travel Brief)
```

The backend also serves the built frontend (`Frontend/dist`) in production, so a single Render service can host both.

## Setup

### 1. Clone & install

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

### 2. Environment

Copy `.env.example` to `.env` in both `Backend/` and `Frontend/`.

**Backend `.env`** requires:
| Var | Source |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google AI Studio |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `ADMIN_EMAILS` | Comma-separated admin email list (authorizes CMS access) |
| `CLOUDINARY_*` | Cloudinary (image uploads) — optional |
| `CLIENT_ORIGIN` | Optional comma-separated extra CORS origins |

**Frontend `.env`** requires:
| Var | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `VITE_ADMIN_EMAILS` | Comma-separated (must match backend) |
| `VITE_API_URL` | Backend URL for production; leave blank in dev to use the Vite proxy |

### 3. Run

```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Terminal 2 — Frontend
cd Frontend
npm run dev
```

Frontend at `http://localhost:5173`, backend at `http://localhost:5000`.

### 4. Auth

Sign in with Google via Clerk. Access to the CMS is authorized in **two places**: the frontend shows the "Admin" button only for emails in `VITE_ADMIN_EMAILS`, and the backend enforces the same allowlist via `ADMIN_EMAILS` on every admin route (`requireAdmin` middleware). Both lists must match.

## Data Pipeline

| Scraper | Source | What it creates |
|---|---|---|
| `ticketsasa` / `kenyabuzz` / `mookh` / `eventbrite` / `tixafrica` | Event listing sites | Draft events (status `draft`, `isGhostLocation: true`) for admin review |
| `venues-gemini` | Google Gemini AI | Venues with name, type, pillar, description, tip, address, vibeTags, coordinates |
| `venues-wikipedia` | Wikipedia GeoSearch API | Venues with name + city + images (no description/tip) |
| `advisors-gemini` | Google Gemini AI | City travel advisories (security, health, entry reqs) |

**Event flow**: Scraped events → `status: "draft"` → Admin reviews in **Pending Approval** → Approve (→ `status: "approved"`, becomes a live event) or delete. `scrapers/index.js` handles fuzzy dedup + rejection terms + upsert.

**Venue flow**: Scraped venues → `status: "scraped"` → Admin reviews in the CMS venue scraper → Accept (→ `"inactive"`) or Edit (→ `"active"`).

## Admin CMS

The CMS (`Frontend/src/admin/AdminDashboard.jsx`) is a dark-themed dashboard with a 4-section sidebar:

- **Dashboard** — overview cards, stats, recent activity
- **Content** — Events hub (Live / Pending / Add), Venues, Advisories, Subscribers
- **Tools** — Scrapers, Analytics, Import/Export, Maintenance
- **Settings** — single page (general, admin accounts, API keys, email, tags, about)

Admin requests go through `adminFetch()` (`Frontend/src/admin/adminApi.js`), which attaches the Clerk session token. The backend verifies the JWT (`middleware/auth.js`) then checks the `ADMIN_EMAILS` allowlist (`middleware/admin.js`).

## Security

- Clerk JWT verification on all admin routes + server-side admin allowlist
- Helmet security headers, CORS with explicit origin allowlist, rate limiting (100 req/min API, 10 req/min AI)
- Input sanitized via `escapeRegex()` on all `$regex` queries (prevents regex injection)
- Field whitelisting on updates — no raw `req.body` passed to Mongo
- Env secrets live in `.env` (git-ignored) / Render dashboard — never committed

**Rotate secrets immediately** if `.env` values are compromised.

## Testing

```bash
cd Backend
npm test
```

## Production Deploy

- **Frontend**: Vercel (`cultural--concierge.vercel.app`), build via `npm run build`; `VITE_API_URL` points to the backend
- **Backend**: Render service (`culture-concierge.onrender.com`) via `Backend/render.yaml` — builds the frontend, installs Puppeteer Chrome, and starts `node src/server.js`. Secrets are set in the Render dashboard (`sync: false` in render.yaml means values are not stored in the repo).
