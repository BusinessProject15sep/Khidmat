// ============================================================================
// import-manual.mjs
//
// Reads a filled-in copy of khidmat-manual-listings-template.xlsx and writes
// each row into Supabase's `providers` table. This is manually-gathered
// data (someone looked businesses up and typed them in) — no scraping, no
// Google API calls, so it doesn't touch any quota.
//
// Re-running with an updated file is safe: rows are upserted by a stable id
// built from city + category + business name, so editing a row and
// re-running updates it instead of creating a duplicate.
//
// ENV VARS REQUIRED:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// USAGE:
//   node import-manual.mjs path/to/filled-in-file.xlsx
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import xlsx from "xlsx";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node import-manual.mjs <path-to-xlsx>");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_LABEL_TO_SLUG = {
  "Plumbing": "plumber", "Electrical": "electrician", "AC & HVAC": "ac_repair",
  "Carpentry": "carpenter", "Painting": "painter", "Tiling & Flooring": "tiler",
  "Roofing & Waterproofing": "roofing", "Welding & Fabrication": "welder",
  "Construction & Masonry": "mason", "Pest Control": "pest_control",
  "Generator & UPS Repair": "generator_repair", "Solar Installation": "solar",
  "Glass & Aluminum Work": "glass_aluminum", "Home Cleaning": "home_cleaning",
  "Deep Cleaning": "deep_cleaning", "Sofa & Carpet Cleaning": "carpet_cleaning",
  "Laundry & Dry Cleaning": "laundry", "Gardening & Lawn Care": "gardening",
  "Water Tank Cleaning": "tank_cleaning", "Appliance Repair": "appliance_repair",
  "Mobile & Computer Repair": "mobile_repair", "TV & Electronics Repair": "electronics_repair",
  "Auto Mechanic": "mechanic", "Car Wash": "car_wash", "Towing Service": "towing",
  "Bike Repair": "bike_repair", "Women's Salon": "salon_women", "Men's Barber": "barber",
  "Spa & Massage": "spa", "Mehndi Artist": "mehndi", "Makeup Artist": "makeup_artist",
  "Personal Trainer": "personal_trainer", "Home Tutor": "home_tutor", "Lawyer": "lawyer",
  "Accountant & Tax": "accountant", "Interior Design": "interior_designer", "Architect": "architect",
  "Photography & Video": "photographer", "Event Planning": "event_planner", "Catering": "caterer",
  "Movers & Packers": "movers", "Courier & Delivery": "courier", "Personal Driver": "driver",
  "Domestic Help / Maid": "maid", "Babysitter & Nanny": "babysitter", "Home Cook / Chef": "cook",
  "Elderly Care": "elderly_care", "Security Guard": "security_guard", "CCTV Installation": "cctv",
  "Pet Grooming": "pet_grooming", "Veterinary Services": "veterinarian",
};

const citySlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "-");
const nameSlug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function run() {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets["Data"];
  if (!sheet) {
    console.error('No "Data" sheet found — make sure you\'re pointing at the right file.');
    process.exit(1);
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

  const { data: cityRows } = await supabase.from("cities").select("id, slug");
  const { data: categoryRows } = await supabase.from("categories").select("id, slug");
  const cityIdBySlug = Object.fromEntries(cityRows.map((c) => [c.slug, c.id]));
  const categoryIdBySlug = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id]));

  let imported = 0, skipped = 0;
  const errors = [];

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2;
    const cityName = row["City (required)"];
    const categoryLabel = row["Category (required)"];
    const businessName = row["Business Name (required)"];

    if (!cityName || !categoryLabel || !businessName) { skipped++; continue; }
    if (businessName.toString().startsWith("Example row")) { skipped++; continue; }

    const cSlug = citySlug(cityName);
    const catSlug = CATEGORY_LABEL_TO_SLUG[categoryLabel.toString().trim()];
    const cityId = cityIdBySlug[cSlug];
    const categoryId = catSlug ? categoryIdBySlug[catSlug] : null;

    if (!cityId) { errors.push(`Row ${rowNum}: unrecognized city "${cityName}"`); continue; }
    if (!categoryId) { errors.push(`Row ${rowNum}: unrecognized category "${categoryLabel}"`); continue; }

    const externalRef = `manual:${cSlug}:${catSlug}:${nameSlug(businessName)}`;

    const record = {
      google_place_id: externalRef,
      name: businessName.toString().trim(),
      category_id: categoryId,
      city_id: cityId,
      area: row["Area / Address"] || null,
      address: row["Area / Address"] || null,
      phone: row["Phone"] ? row["Phone"].toString() : null,
      google_rating: row["Google Rating"] ?? null,
      google_rating_count: row["Rating Count"] ?? null,
      price_label: row["Price Range"] || "Contact for quote",
      hours: row["Hours"] ? { raw: row["Hours"].toString() } : null,
      source: "manual",
      last_synced_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("providers").upsert(record, { onConflict: "google_place_id" });
    if (error) errors.push(`Row ${rowNum} (${businessName}): ${error.message}`);
    else imported++;
  }

  console.log(`Imported/updated ${imported} providers. Skipped ${skipped} blank/example rows.`);
  if (errors.length) {
    console.log(`\n${errors.length} row(s) had problems:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
