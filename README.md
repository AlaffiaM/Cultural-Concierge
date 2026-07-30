# Culture Concierge

AI-powered cultural discovery platform for African cities — Lagos, Abuja, Nairobi, and Kigali. Discovers venues, events, and travel advisories via automated scrapers.

## Architecture

```
├── Backend/          Express + Mongoose API (port 5000)
│   ├── routes/       API endpoints
│   ├── scrapers/     Event + venue + advisory importers
│   ├── models/       Mongoose schemas
│   ├── middleware/    Auth (Clerk JWT), admin guard
│   └── utils/        Sanitizers, travel brief updater
│
├── alaffia-concierge/ React + Vite frontend (port 5173)
│   └── src/
│       ├── admin/    CMS dashboard (events, venues, scrapers)
│       ├── lib/      Clerk token helper
│       └── *.jsx     Public pages (Venues, Happenings, Travel Brief)
```

## Setup

### 1. Clone & install

```bash
cd backend
npm install

cd ../alaffia-concierge
npm install
```

### 2. Environment

Copy `.env.example` to `.env` in both `Backend/` and `alaffia-concierge/`.

**Backend `.env`** requires:
| Var | Source |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google AI Studio |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `ADMIN_EMAILS` | Comma-separated admin email list |

**Frontend `.env`** requires:
| Var | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `VITE_ADMIN_EMAILS` | Comma-separated (same as backend) |

### 3. Run

```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Terminal 2 — Frontend
cd alaffia-concierge
npm run dev
```

Frontend at `http://localhost:5173`, backend at `http://localhost:5000`.

### 4. Auth

Sign in with Google via Clerk. Only emails in `ADMIN_EMAILS` can access the CMS (click "Admin" in the top bar after signing in).

## Data Pipeline

| Scraper | Source | What it creates |
|---|---|---|
| `venues-gemini` | Google Gemini AI | Venues with name, type, pillar, description, tip, address, vibeTags, coordinates |
| `venues-wikipedia` | Wikipedia GeoSearch API | Venues with name + city + images (no description/tip) |
| `advisors-gemini` | Google Gemini AI | City travel advisories (security, health, entry reqs) |
| `ticketsasa` / `kenyabuzz` / `mookh` / `eventbrite` | Event listing sites | Draft events for review |

**Flow**: Scraped venues → `status: "scraped"` → Admin reviews in CMS → Accepts (→ `"inactive"`) or Edits (→ `"active"`). Scraped events → `status: "draft"` → Admin approves in Pending Events.

## Security

- Clerk JWT authentication on all admin routes
- Helmet security headers, CORS with explicit origin, rate limiting (100 req/min API, 10 req/min AI)
- Input sanitized via `escapeRegex()` on all `$regex` queries
- No `req.body` passed directly to `findByIdAndUpdate` (field whitelisting)
- Super admin check via `CLERK_SECRET_KEY` server-side verification

**Rotate secrets immediately** if `.env` values are compromised.

## Testing

```bash
cd Backend
npm test
```
