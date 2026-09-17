// ============================================================================
// sync-osm.mjs
//
// Free supplementary sync from OpenStreetMap (via the Overpass API — no key,
// no billing) into the same `providers` table sync-places.mjs writes to.
// Skips anything that looks like it's already in the DB (from Google or a
// previous OSM run) so re-running doesn't create duplicates.
//
// HONEST LIMITATION: OSM is crowdsourced. Coverage for small home-service
// businesses in Pakistan (a solo plumber or electrician working out of a
// shop) is much thinner than Google's. Expect this to add a modest number
// of extra listings, not double your dataset — treat it as a free top-up,
// not a primary source. This script only covers the categories below that
// have a clean OSM tag — the other ~45 categories in the full taxonomy
// (tutors, lawyers, event planners, domestic help, etc.) have no reliable
// OSM equivalent and are Google-only for now.
//
// ENV VARS REQUIRED:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// USAGE:
//   node sync-osm.mjs                # every city
//   node sync-osm.mjs --city=lahore
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CITIES = [
  { slug: "lahore", name: "Lahore" }, { slug: "karachi", name: "Karachi" }, { slug: "islamabad", name: "Islamabad" },
  { slug: "rawalpindi", name: "Rawalpindi" }, { slug: "faisalabad", name: "Faisalabad" }, { slug: "multan", name: "Multan" },
  { slug: "peshawar", name: "Peshawar" }, { slug: "quetta", name: "Quetta" }, { slug: "sialkot", name: "Sialkot" },
  { slug: "gujranwala", name: "Gujranwala" }, { slug: "hyderabad", name: "Hyderabad" }, { slug: "bahawalpur", name: "Bahawalpur" },
  { slug: "sargodha", name: "Sargodha" }, { slug: "sukkur", name: "Sukkur" }, { slug: "sheikhupura", name: "Sheikhupura" },
  { slug: "rahim-yar-khan", name: "Rahim Yar Khan" }, { slug: "gujrat", name: "Gujrat" }, { slug: "sahiwal", name: "Sahiwal" },
  { slug: "jhang", name: "Jhang" }, { slug: "dera-ghazi-khan", name: "Dera Ghazi Khan" }, { slug: "kasur", name: "Kasur" },
  { slug: "okara", name: "Okara" }, { slug: "mardan", name: "Mardan" }, { slug: "chiniot", name: "Chiniot" },
  { slug: "nawabshah", name: "Nawabshah" }, { slug: "larkana", name: "Larkana" }, { slug: "muzaffargarh", name: "Muzaffargarh" },
  { slug: "jhelum", name: "Jhelum" }, { slug: "abbottabad", name: "Abbottabad" }, { slug: "mingora", name: "Mingora" },
];

// OSM tag -> our category slug. One category can match several tags.
const TAG_TO_CATEGORY = [
  { key: "craft", value: "plumber", category: "plumber" },
  { key: "craft", value: "electrician", category: "electrician" },
  { key: "craft", value: "hvac", category: "ac_repair" },
  { key: "craft", value: "carpenter", category: "carpenter" },
  { key: "craft", value: "painter", category: "painter" },
  { key: "craft", value: "tiler", category: "tiler" },
  { key: "craft", value: "roofer", category: "roofing" },
  { key: "office", value: "cleaning", category: "home_cleaning" },
  { key: "shop", value: "laundry", category: "laundry" },
  { key: "shop", value: "car_repair", category: "mechanic" },
  { key: "shop", value: "car_wash", category: "car_wash" },
  { key: "shop", value: "hairdresser", category: "salon_women" },
  { key: "office", value: "lawyer", category: "lawyer" },
  { key: "office", value: "accountant", category: "accountant" },
  { key: "amenity", value: "veterinary", category: "veterinarian" },
];

const NOMINATIM_HEADERS = { "User-Agent": "khidmat-app-sync/1.0 (contact: set-your-email-here)" };

async function fetchCityBBox(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityName)}&country=Pakistan&format=json&limit=1`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  const rows = await res.json();
  if (!rows.length) throw new Error(`Nominatim found no bounding box for ${cityName}`);
  const [south, north, west, east] = rows[0].boundingbox.map(Number);
  return { south, west, north, east };
}

function buildOverpassQuery(bbox) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const clauses = TAG_TO_CATEGORY.map(
    (t) => `node["${t.key}"="${t.value}"](${bboxStr});way["${t.key}"="${t.value}"](${bboxStr});`
  ).join("\n  ");
  return `[out:json][timeout:60];\n(\n  ${clauses}\n);\nout center tags;`;
}

async function runOverpass(query) {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    console.error("Overpass query failed:", await res.text());
    return [];
  }
  const data = await res.json();
  return data.elements || [];
}

function categoryFor(tags) {
  for (const t of TAG_TO_CATEGORY) {
    if (tags[t.key] === t.value) return t.category;
  }
  return null;
}

function addressFor(tags) {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

// Cheap similarity check so we don't insert "Zubair Plumbing Services" twice
// just because Google and OSM both have it under slightly different casing.
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function similar(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

async function run() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const cities = args.city ? CITIES.filter((c) => c.slug === args.city) : CITIES;

  const { data: cityRows } = await supabase.from("cities").select("id, slug");
  const { data: categoryRows } = await supabase.from("categories").select("id, slug");
  const cityIdBySlug = Object.fromEntries(cityRows.map((c) => [c.slug, c.id]));
  const categoryIdBySlug = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  let inserted = 0, skippedDupe = 0, skippedNoName = 0;

  for (const city of cities) {
    console.log(`Fetching OSM data for ${city.name}...`);
    const bbox = await fetchCityBBox(city.name);
    const query = buildOverpassQuery(bbox);
    const elements = await runOverpass(query);

    // Pull existing providers for this city once, so dupe-checking is local (no per-row query)
    const { data: existing } = await supabase
      .from("providers")
      .select("id, name, category_id")
      .eq("city_id", cityIdBySlug[city.slug]);

    for (const el of elements) {
      const tags = el.tags || {};
      const category = categoryFor(tags);
      if (!category || !tags.name) { skippedNoName++; continue; }

      const categoryId = categoryIdBySlug[category];
      const dupe = existing.some((p) => p.category_id === categoryId && similar(p.name, tags.name));
      if (dupe) { skippedDupe++; continue; }

      const lat = el.lat ?? el.center?.lat ?? null;
      const lng = el.lon ?? el.center?.lon ?? null;
      const osmRef = `osm:${el.type}/${el.id}`; // reused as the external id for idempotent re-runs

      const row = {
        google_place_id: osmRef, // shared "external ref" column across sources — see BACKEND-SETUP.md
        name: tags.name,
        category_id: categoryId,
        city_id: cityIdBySlug[city.slug],
        area: addressFor(tags),
        address: addressFor(tags),
        lat, lng,
        phone: tags.phone || tags["contact:phone"] || null,
        hours: tags.opening_hours ? { raw: tags.opening_hours } : null,
        source: "openstreetmap",
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("providers").upsert(row, { onConflict: "google_place_id" });
      if (error) console.error(`Insert failed for ${tags.name}:`, error.message);
      else { inserted++; existing.push({ id: null, name: tags.name, category_id: categoryId }); }
    }

    // Overpass's public instance asks for max ~1 heavy query/sec from a single client
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`Done. Inserted/updated ${inserted}. Skipped ${skippedDupe} likely duplicates, ${skippedNoName} unnamed nodes.`);
}

run().catch((err) => {
  console.error("OSM sync failed:", err);
  process.exit(1);
});
