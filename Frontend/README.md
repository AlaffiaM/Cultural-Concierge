# Culture Concierge — Frontend

React 19 + Vite 8 SPA. Mobile-first UI for discovering venues, events, and travel info across African cities.

## Stack

- **React 19** — UI library
- **Vite 8** — build tool
- **Clerk React** — authentication (Google OAuth)
- **No UI framework** — custom CSS with CSS variables

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Pages

| Route | Component | Description |
|---|---|---|
| Home | — | Landing page with Google sign-in |
| Cities | `CityCards` | City grid selector |
| Venues | `VenuesView` | Browse + search + filter venues by pillar/vibe |
| Happenings | `HappeningsView` | Calendar-based event browser with date range filtering |
| Travel Brief | `TravelBrief` | AI-generated city security + health advisories |
| Venue Detail | `VenueDetailModal` | Full venue info with related events |
| Admin CMS | `AdminDashboard` | Full admin panel with tabs |

## Admin Tabs

| Tab | Component | Purpose |
|---|---|---|
| Overview | `AdminOverview` | Dashboard stats, activity feed, pillar breakdown |
| Live Events | `AdminEvents` | Manage approved events |
| Pending Events | `AdminPendingEvents` | Review + approve scraped draft events |
| Venues | `AdminVenues` | CRUD venues, bulk actions, enrich images |
| Tags | `AdminTags` | Manage tag taxonomy |
| Subscribers | `AdminSubscribers` | Email subscriber list |
| Settings | `AdminSettings` | Env info, danger zone, health check |
| Scraper | `AdminScraper` | Run event scrapers (Ticketsasa, Kenyabuzz, etc.) |
| Advisories | `AdminAdvisories` | Generate travel advisories via Gemini |

## State

- No global state library — data fetched on mount via `fetch()` in `App.jsx`
- Venues cached in `sessionStorage` for fast re-visit
- Admin uses `adminFetch()` helper (Clerk JWT + JSON headers)
- Toast notifications via `ToastProvider` context (admin only)
- Confirm dialogs via `ConfirmModal` + `useConfirm()` hook

## Styling

- CSS variables for theming (`--admin-copper`, `--admin-sage`, etc.)
- `AdminDashboard.css` contains all admin styles
- Public pages use `index.css` + component-specific CSS files
- Animations via CSS `@keyframes` (fade-in, spinner, toast slide-in)
