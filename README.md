# Khidmat App

Pakistan-wide local services directory — search plumbers, electricians, and
~50 other service categories across 30 major cities, with in-app chat and a
reporting system.

## Structure

- `schema.sql` — Supabase/Postgres schema (tables, RLS policies, seed data
  for cities and categories). Run this in the Supabase SQL Editor once when
  setting up a new project — it's not something the app runs automatically.
- `sync/` — Node scripts that pull real listings into the database.
  - `sync-places.mjs` — primary source, Google Places API (New).
  - `sync-osm.mjs` — free supplementary source, OpenStreetMap/Overpass.
  - See `BACKEND-SETUP.md` for how to configure and run these.
- `prototype/khidmat-app.jsx` — the current testable frontend. This is a
  prototype for validating the product flow (search, chat, claiming,
  reporting), not the final production frontend.
- `BACKEND-SETUP.md` — full setup walkthrough: creating the Supabase
  project, getting a Google Places API key, running the schema and sync
  jobs, and what's not built yet (auth, provider claim verification).

## Quick start

1. Create a Supabase project, run `schema.sql` in its SQL Editor.
2. `cd sync && npm install`
3. Copy `.env.example` to `.env` and fill in your keys (or export them
   directly — see BACKEND-SETUP.md).
4. `node sync-places.mjs --city=lahore` to do a first, small real sync.
