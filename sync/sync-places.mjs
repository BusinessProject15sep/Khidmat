// ============================================================================
// sync-places.mjs
//
// Pulls provider listings from the Google Places API (New — Text Search) for
// every (city x category) pair and upserts them into Supabase, keyed by
// google_place_id so re-runs update existing rows instead of duplicating.
//
// Run this on a schedule OUTSIDE this chat environment (no network egress
// here) — e.g. as a GitHub Actions cron job, a Supabase Edge Function on a
// pg_cron trigger, or a small server. Needs Node 18+ (built-in fetch).
//
// ENV VARS REQUIRED:
//   GOOGLE_PLACES_API_KEY   — Places API (New) key, Text Search enabled
//   SUPABASE_URL            — https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS for writes)
//
// USAGE:
//   node sync-places.mjs                # sync every city x category
//   node sync-places.mjs --city=lahore  # sync one city only
//   node sync-places.mjs --category=plumber
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Keep this list in sync with the `cities` / `categories` seed rows in schema.sql
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

// searchTerm is what gets sent to Google as `"<searchTerm> in <city>, Pakistan"`
const CATEGORIES = [
  { slug: "plumber", searchTerm: "plumber" },
  { slug: "electrician", searchTerm: "electrician" },
  { slug: "ac_repair", searchTerm: "AC repair technician" },
  { slug: "carpenter", searchTerm: "carpenter" },
  { slug: "painter", searchTerm: "house painter" },
  { slug: "tiler", searchTerm: "tile flooring contractor" },
  { slug: "roofing", searchTerm: "roofing waterproofing contractor" },
  { slug: "welder", searchTerm: "welding fabrication shop" },
  { slug: "mason", searchTerm: "construction contractor" },
  { slug: "pest_control", searchTerm: "pest control service" },
  { slug: "generator_repair", searchTerm: "generator UPS repair" },
  { slug: "solar", searchTerm: "solar installation company" },
  { slug: "glass_aluminum", searchTerm: "glass aluminum fabrication" },
  { slug: "home_cleaning", searchTerm: "home cleaning service" },
  { slug: "deep_cleaning", searchTerm: "deep cleaning service" },
  { slug: "carpet_cleaning", searchTerm: "sofa carpet cleaning service" },
  { slug: "laundry", searchTerm: "laundry dry cleaning" },
  { slug: "gardening", searchTerm: "gardening lawn care service" },
  { slug: "tank_cleaning", searchTerm: "water tank cleaning service" },
  { slug: "appliance_repair", searchTerm: "appliance repair service" },
  { slug: "mobile_repair", searchTerm: "mobile phone repair" },
  { slug: "electronics_repair", searchTerm: "TV electronics repair" },
  { slug: "mechanic", searchTerm: "auto mechanic" },
  { slug: "car_wash", searchTerm: "car wash" },
  { slug: "towing", searchTerm: "towing service" },
  { slug: "bike_repair", searchTerm: "bike repair shop" },
  { slug: "salon_women", searchTerm: "women's salon" },
  { slug: "barber", searchTerm: "men's barber shop" },
  { slug: "spa", searchTerm: "spa massage center" },
  { slug: "mehndi", searchTerm: "mehndi artist" },
  { slug: "makeup_artist", searchTerm: "makeup artist" },
  { slug: "personal_trainer", searchTerm: "personal fitness trainer" },
  { slug: "home_tutor", searchTerm: "home tutor" },
  { slug: "lawyer", searchTerm: "lawyer" },
  { slug: "accountant", searchTerm: "tax accountant" },
  { slug: "interior_designer", searchTerm: "interior designer" },
  { slug: "architect", searchTerm: "architect firm" },
  { slug: "photographer", searchTerm: "wedding photographer videographer" },
  { slug: "event_planner", searchTerm: "event planner" },
  { slug: "caterer", searchTerm: "catering service" },
  { slug: "movers", searchTerm: "movers and packers" },
  { slug: "courier", searchTerm: "courier delivery service" },
  { slug: "driver", searchTerm: "personal driver service" },
  { slug: "maid", searchTerm: "domestic help agency" },
  { slug: "babysitter", searchTerm: "babysitter nanny service" },
  { slug: "cook", searchTerm: "home cook chef service" },
  { slug: "elderly_care", searchTerm: "elderly care service" },
  { slug: "security_guard", searchTerm: "security guard service" },
  { slug: "cctv", searchTerm: "CCTV installation service" },
  { slug: "pet_grooming", searchTerm: "pet grooming" },
  { slug: "veterinarian", searchTerm: "veterinary clinic" },
];

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.internationalPhoneNumber",
  "places.regularOpeningHours",
  "places.reviews",
].join(",");

async function searchPlaces(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
  });
  if (!res.ok) {
    console.error(`Places API error for "${query}":`, await res.text());
    return [];
  }
  const data = await res.json();
  return data.places || [];
}

// Google's priceLevel enum -> our smallint + rough PKR label (placeholder
// until claimed providers set their own real pricing)
const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_UNSPECIFIED: [null, "Contact for quote"],
  PRICE_LEVEL_FREE: [0, "Contact for quote"],
  PRICE_LEVEL_INEXPENSIVE: [1, "Rs 500 – 1,500 / visit"],
  PRICE_LEVEL_MODERATE: [2, "Rs 800 – 2,000 / visit"],
  PRICE_LEVEL_EXPENSIVE: [3, "Rs 1,500 – 4,500 / visit"],
  PRICE_LEVEL_VERY_EXPENSIVE: [4, "Rs 4,000+ / visit"],
};

function mapHours(regularOpeningHours) {
  if (!regularOpeningHours?.weekdayDescriptions) return null;
  const out = {};
  for (const line of regularOpeningHours.weekdayDescriptions) {
    const [day, ...rest] = line.split(": ");
    out[day] = rest.join(": ");
  }
  return out;
}

async function upsertProvider(place, categoryId, cityId) {
  const [priceLevel, priceLabel] = PRICE_LEVEL_MAP[place.priceLevel] || [null, "Contact for quote"];

  const row = {
    google_place_id: place.id,
    name: place.displayName?.text || "Unnamed provider",
    category_id: categoryId,
    city_id: cityId,
    area: place.formattedAddress || null,
    address: place.formattedAddress || null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    phone: place.internationalPhoneNumber || null,
    google_rating: place.rating ?? null,
    google_rating_count: place.userRatingCount ?? null,
    price_level: priceLevel,
    price_label: priceLabel,
    hours: mapHours(place.regularOpeningHours),
    source: "google_places",
    last_synced_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("providers")
    .upsert(row, { onConflict: "google_place_id" })
    .select("id")
    .single();

  if (error) {
    console.error(`Upsert failed for ${row.name}:`, error.message);
    return null;
  }

  // Replace review snapshot for this provider (cheap since Places only returns ~5)
  if (place.reviews?.length) {
    await supabase.from("provider_reviews").delete().eq("provider_id", data.id).eq("source", "google_places");
    const reviewRows = place.reviews.map((r) => ({
      provider_id: data.id,
      source: "google_places",
      author: r.authorAttribution?.displayName || null,
      rating: r.rating ?? null,
      body: r.text?.text || null,
      review_time: r.publishTime || null,
    }));
    await supabase.from("provider_reviews").insert(reviewRows);
  }

  return data.id;
}

async function run() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
  const cities = args.city ? CITIES.filter((c) => c.slug === args.city) : CITIES;
  const categories = args.category ? CATEGORIES.filter((c) => c.slug === args.category) : CATEGORIES;

  const { data: cityRows } = await supabase.from("cities").select("id, slug");
  const { data: categoryRows } = await supabase.from("categories").select("id, slug");
  const cityIdBySlug = Object.fromEntries(cityRows.map((c) => [c.slug, c.id]));
  const categoryIdBySlug = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  let synced = 0;
  for (const city of cities) {
    for (const category of categories) {
      const query = `${category.searchTerm} in ${city.name}, Pakistan`;
      console.log(`Searching: ${query}`);
      const places = await searchPlaces(query);
      for (const place of places) {
        const id = await upsertProvider(place, categoryIdBySlug[category.slug], cityIdBySlug[city.slug]);
        if (id) synced++;
      }
      // Places API rate limits are generous, but be a polite neighbor
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log(`Done. Synced/updated ${synced} providers.`);
}

run().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
