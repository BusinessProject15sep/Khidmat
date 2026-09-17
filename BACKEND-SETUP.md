# Backend setup

## 1. Create the Supabase project
- New project at supabase.com, note the project URL and both API keys (anon + service_role).
- Open the SQL editor, paste in `schema.sql`, run it. This creates all tables, seeds cities/categories, and turns on RLS + realtime for chat.

## 2. Get a Google Places API key
- In Google Cloud Console, enable **Places API (New)**.
- Restrict the key to Places API only, and to your server's IP if it's static.
- Text Search billing is per-request — six categories x three cities x one run is 18 requests; budget accordingly as you add cities.

## 3. Run the sync job
```bash
npm install
export GOOGLE_PLACES_API_KEY=...
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
npm run sync
```
Re-running is safe — providers are upserted on `google_place_id`, so existing rows get refreshed (rating, hours, reviews) rather than duplicated.

## 4. Schedule it
Pick one:
- **GitHub Actions cron** — simplest, free tier is enough for a weekly/daily sync.
- **Supabase Edge Function + pg_cron** — keeps everything inside Supabase, no external CI needed.
- Either way, start with weekly — ratings/hours don't change fast enough to justify more, and it keeps Places API spend down.

## 5. Wire the frontend to real data
The prototype (`khidmat-app.jsx`) currently reads from local app storage seeded with hardcoded listings. Next step there: swap the `window.storage` reads for `supabase.from('providers').select(...)` calls filtered by city_id/category_id, and point the chat screens at the `conversations`/`messages` tables with a realtime subscription instead of local storage.

## Notes on what's NOT covered yet
- **Auth**: schema assumes Supabase Auth (`auth.users` + the `profiles` table extending it) but no sign-up/login flow is built yet — that's the natural next piece once this is wired up.
- **Provider claiming flow**: `providers.claimed_by` exists and RLS allows an owner to update their own row, but there's no UI yet for a business to verify they own a listing (phone OTP is the usual pattern here).
- **Price data**: still Google's rough price_level guess until a provider claims their listing and sets real rates.
