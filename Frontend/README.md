# Culture Concierge — Frontend

React 19 + Vite SPA. Mobile-first UI for discovering venues, events, and travel info across African cities, plus a full admin CMS.

## Stack

- **React 19** — UI library
- **Vite 8** — build tool
- **Clerk React** — authentication (Google OAuth)
- **No UI framework** — custom CSS with CSS variables

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173; proxies `/api` to localhost:5000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Env Vars

See `.env.example`. Required: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_ADMIN_EMAILS` (must match backend `ADMIN_EMAILS`). `VITE_API_URL` optional — blank in dev (Vite proxy), set to `https://culture-concierge.onrender.com` in production. The API base is consumed via `lib/api.js` (`API_BASE`).

## Public Pages

| View | Component | Description |
|---|---|---|
| Home | — | Landing page with Google sign-in |
| Cities | `CityCards` | City grid selector |
| Venues | `VenuesView` | Browse + search + filter venues by pillar/vibe |
| Happenings | `HappeningsView` | Calendar-based event browser with date range filtering |
| Travel Brief | `TravelBrief` | AI-generated city security + health advisories |
| Venue Detail | `VenueDetailModal` | Full venue info with related events |

View switching happens in `App.jsx` via the `view` state (`home` / `cities` / `venues` / `admin`), not a router. `viewMode` inside the venues view switches between `places` / `happenings` / `travelbrief`.

## Admin CMS

Entry: `admin/AdminDashboard.jsx`. A dark-themed layout with a fixed sidebar and a main content area. The sidebar (`SECTIONS` array) is a 4-section accordion; on screens ≤900px it becomes a slide-in drawer opened by the hamburger button.

| Sidebar section | Navigates to | Pages |
|---|---|---|
| Dashboard | overview | `AdminOverview` — stat cards, quick actions, recent activity |
| Content | `AdminHub` grid | Events hub → `AdminEvents` (live), `AdminPendingEvents` (draft review), `AdminAddEvent` (+ `EventEditor`); `AdminVenues` (+ `VenueEditor`); `AdminAdvisories`; `AdminSubscribers` |
| Tools | `AdminHub` grid | `AdminScraper` (event scrapers + `AdminVenueScraper`), `AdminAnalytics`, `AdminMaintenance` (danger zone + CSV exports + system health), Import/Export uses `AdminMaintenance exportOnly` |
| Settings | single page | `AdminSettings` — one scrollable page with General, Admin Accounts, API Keys, Email, Tags (`AdminTags`), About |

Shared admin components: `EventEditor` / `VenueEditor` (create/edit forms with `ImageUploader`), `ConfirmModal` (`useConfirm()` hook), `Toast` (`ToastProvider` / `useToast()`), `AdminHub` (grid of navigation cards), `adminApi` (fetch helper).

## State & Data Flow

- No global state library — public data is fetched on mount in `App.jsx` via `fetch()`; venues are cached in `sessionStorage` (`alaffia_venues`)
- Admin requests use `adminApi.adminFetch()`, which prepends `API_BASE`, attaches the Clerk session token (`Authorization: Bearer`), and throws on non-OK responses
- Clerk token provider is wired in `lib/clerk.js` via `setTokenProvider(getToken)` so the backend can verify the JWT
- Toast notifications via `ToastProvider` context (admin only); confirm dialogs via `ConfirmModal` + `useConfirm()`

## Styling

- Public theme: `index.css` (base + CSS variables) + `App.css` + component CSS files (`CityCards.css`, `VenuesView.css`, `HappeningsView.css`, `TravelBrief.css`, `VenueDetailModal.css`)
- Admin theme: `admin/AdminDashboard.css` (all admin styles, including the mobile drawer and settings cards) + `admin/EventEditor.css` + `admin/VenueEditor.css`
- Animations via CSS `@keyframes` (fade-in, spinner, toast slide-in, scraper pulses)
