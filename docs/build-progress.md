# Build Progress

Tracks progress against the Build Order in [`menurate-spec.md`](menurate-spec.md) Section 11.
Updated as steps complete — see git history for full detail on each one.

## Status: 9 of 11 steps complete

### ✅ Step 1 — Schema + Supabase setup
Full Section 7 data model as Supabase migrations (profiles, brands, restaurants, menu_items, tags,
menu_item_tags, restaurant_tags, ratings, reports, edit_logs), RLS enabled on every table. Live
Supabase project: `menurate-production`.

### ✅ Step 2 — Auth
Email/password sign-up/in/out via Supabase Auth. Session refresh via `proxy.ts` (Next.js 16's
renamed middleware). Email confirmation is **off** for now (dev convenience, no inbox round-trip
needed to test) — flip `supabase/config.toml`'s `[auth.email] enable_confirmations` back on before
real users arrive.

### ✅ Step 3 — Restaurant + MenuItem read pages
`/restaurants` list, `/restaurants/[id]` detail with menu grouped by category. Chain restaurants
show "This location" vs "All [Brand] locations" ratings side by side; independents show one.
Seeded via `scripts/seed.mjs`.

### ✅ Step 4 — Tag system + unified search
Search bar in the header (every page) searches restaurant names and dish/tag names simultaneously.
Dish matching (name OR tag, sorted by rating) lives in a `search_menu_items()` Postgres function.

### ✅ Step 5 — Rating flow
`/menu-items/[itemId]` detail page: submit a 1–5 rating + optional comment, aggregate updates live.
One rating per (user, item) — re-rating updates rather than duplicating.

### ✅ Step 6 — Rating integrity
Per-account daily rate limit (20 new ratings/24h) and burst/anomaly auto-flagging (5+ distinct
users rating one restaurant high/low within an hour) both enforced by database triggers. Signup
throttling per IP is Supabase Auth's own built-in rate limit — no custom code needed.

### ✅ Step 7 — Report flow + admin page
Report button on restaurants, menu items, and ratings/comments. `/admin/reports`: dismiss/remove
actions, plus a duplicate-restaurant merge tool. Admin account: `isaiahkwapisz@gmail.com`.

### ✅ Step 8 — Contribution flow
Trust-gated menu item edits — established accounts (7+ days old, unpenalized trust score) go live
immediately; low-trust accounts queue in `pending_edits` for admin approval. Tag application (to
existing tags) is live for any signed-in user; creating a brand-new tag always queues for admin
approval. Auto-revert: 3+ open reports on a menu item reverts its most recent edit automatically.

### ✅ Step 9 — Scraper
Standalone pipeline in `scraper/` (`npm run scrape`), architecturally separate from the Next.js
app. Restaurant discovery is a manually-curated URL list (`scraper/sources.mjs`, currently empty —
Google Places API setup was deliberately deferred). Geocoding via free OSM Nominatim. Parses
schema.org Menu/MenuItem structured data; sites without it are skipped rather than scraped with
fragile generic HTML heuristics. Fuzzy dedup (name + address, `pg_trgm`) prevents duplicate
restaurant rows at ingestion. Pages are rendered with a real headless browser (`scraper/browser.mjs`,
Playwright) before parsing, not a plain fetch, since real sites are often JavaScript-rendered.

**Real-world research (post-step-9, not yet reflected in any ingested data):** checked 10 real
sites for usable structured data — 4 major fast-food chains (Tim Hortons, Wendy's, Mary Brown's
rendered fully but emit zero Restaurant/Menu schema; McDonald's blocks automated browser requests
outright) and 6 real independent Ottawa restaurants (Cocotte, Riviera, Supply & Demand, Alora,
SideDoor, Rabbit Hole). One partial hit: **SideDoor Ottawa** (Wix-built) emits real `Restaurant`
schema — accurate name/address/geo/hours — but, like every other site checked, no `MenuItem` data
for actual dishes. Conclusion: menu-item-level structured data is genuinely rare in the wild, rarer
than restaurant-level data. Options to revisit later: keep hunting for a fully-compatible site,
extend the scraper to do partial ingestion (restaurant-only, no items, relying on step 8's
crowd-contribution flow to fill in dishes), or leave as a documented limitation.

### ⬜ Step 10 — Restaurant claim flow
Not started.

### ⬜ Step 11 — Photo upload + proactive image moderation
Not started.

## Live infrastructure

- **Database/Auth/Storage**: Supabase project `menurate-production`
- **Source control**: [github.com/IsaiahKwpz/MenuRate.Com](https://github.com/IsaiahKwpz/MenuRate.Com)
- **Hosting**: none yet — the app only runs via `npm run dev` on localhost. Deploying (Railway
  per spec Section 8) hasn't come up as a Build Order step; worth doing whenever you want this
  reachable outside your own machine.

## Known gaps to revisit before real users

- Email confirmation is off — re-enable in `supabase/config.toml` before launch.
- `scraper/sources.mjs` has no real restaurant URLs yet — the pipeline is proven against test
  fixtures, but real-world research found menu-item-level structured data genuinely rare (see step
  9 notes above) and hasn't ingested a real site yet.
- The footer's "claim or request removal" link is a placeholder `mailto:` until step 10 builds the
  real claim flow.
- No deployment/hosting exists yet.
