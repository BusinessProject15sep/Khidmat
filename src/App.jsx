import React, { useState, useEffect, useRef } from "react";
import {
  Search, MapPin, Star, Phone, MessageCircle, Flag, ChevronLeft, Clock, ShieldCheck, X, Send,
  Wrench, Zap, Snowflake, Sparkles, PaintBucket, Car, User, Home as HomeIcon, MessageSquare, CheckCircle2,
  Hammer, LayoutGrid, CloudRain, Flame, Building2, Bug, BatteryCharging, Sun, Layers, Shirt, Leaf, Droplet,
  Smartphone, Tv, Truck, Bike, Scissors, Heart, Feather, Brush, Dumbbell, GraduationCap, Scale, Calculator,
  Palette, Ruler, Camera, PartyPopper, UtensilsCrossed, Package, Baby, ChefHat, HeartHandshake, Shield,
  Video, PawPrint, Stethoscope, AlertTriangle, Upload, Plus, Globe, CircleCheck, CircleX, ImagePlus,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js"; // npm install @supabase/supabase-js

// ---------------------------------------------------------------------------
// Search & listings now read from the real Supabase database (public REST
// API, publishable key — safe client-side, matches the RLS policies in
// schema.sql). Chat, claiming, and reports still run on local demo storage
// because those need real user accounts (Supabase Auth) to write safely —
// that's the next piece to build. If a live query fails or comes back empty
// (e.g. the sync script hasn't been run yet), results fall back to the
// seeded demo listings so the app is never blank.
//
// SECURITY NOTE: the claim-verification flow in this file shows the OTP
// code on-screen instead of texting it, because there is no SMS gateway
// wired up yet. That is a placeholder, not real verification — swap it for
// a server-sent SMS code (Twilio, or a local aggregator) before this goes
// in front of anyone but you. Until then, treat every "verified" badge in
// this build as unverified.
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://cmxobnlzdeziritcveyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNteG9ibmx6ZGV6aXJpdGN2ZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Mzc1NTksImV4cCI6MjEwNTAxMzU1OX0.3SQUvpWz_ALzMN_IRsmu2LaFd-5k1AiXTeYdwJ7j0G8";

// One client, reused everywhere — this is what carries the anonymous (later:
// phone-verified) session and opens the Realtime websocket for chat.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function hoursDisplay(hours) {
  if (!hours) return "Contact for hours";
  if (hours.raw) return hours.raw;
  const first = Object.values(hours)[0];
  return first ? `${first} (varies by day)` : "Contact for hours";
}

async function fetchLiveProviders(citySlug, categorySlug) {
  const select = "*,categories!inner(slug),cities!inner(slug,name),provider_reviews(body,rating,author)";
  const params = new URLSearchParams({
    select,
    "cities.slug": `eq.${citySlug}`,
    order: "google_rating.desc.nullslast",
  });
  if (categorySlug) params.set("categories.slug", `eq.${categorySlug}`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/providers?${params.toString()}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  const rows = await res.json();

  return rows.map((r) => ({
    id: r.id,
    category: r.categories?.slug,
    name: r.name,
    area: r.area || r.address || "",
    city: r.cities?.name || citySlug,
    rating: r.google_rating ?? null,
    ratingCount: r.google_rating_count ?? 0,
    phone: r.phone,
    hours: hoursDisplay(r.hours),
    price: r.price_label || "Contact for quote",
    verified: r.verified,
    claimedBy: r.claimed_by,
    ownerUid: r.owner_uid || null, // set once a real provider account is linked — see schema.sql
    review: r.provider_reviews?.[0]?.body || "No reviews yet.",
    _live: true,
  }));
}

// labelUr is filled in for a representative sample only — translating the
// rest is a content task for a native Urdu speaker, not something to
// machine-translate for a product people trust inside their homes.
const CATEGORY_SECTIONS = [
  {
    title: "Home Repairs & Trades",
    items: [
      { id: "plumber", label: "Plumbing", labelUr: "پلمبر", icon: Wrench },
      { id: "electrician", label: "Electrical", labelUr: "الیکٹریشن", icon: Zap },
      { id: "ac_repair", label: "AC & HVAC", labelUr: "اے سی مرمت", icon: Snowflake },
      { id: "carpenter", label: "Carpentry", labelUr: "کارپینٹر", icon: Hammer },
      { id: "painter", label: "Painting", labelUr: "پینٹر", icon: PaintBucket },
      { id: "tiler", label: "Tiling & Flooring", icon: LayoutGrid },
      { id: "roofing", label: "Roofing & Waterproofing", icon: CloudRain },
      { id: "welder", label: "Welding & Fabrication", icon: Flame },
      { id: "mason", label: "Construction & Masonry", icon: Building2 },
      { id: "pest_control", label: "Pest Control", icon: Bug },
      { id: "generator_repair", label: "Generator & UPS Repair", icon: BatteryCharging },
      { id: "solar", label: "Solar Installation", icon: Sun },
      { id: "glass_aluminum", label: "Glass & Aluminum Work", icon: Layers },
    ],
  },
  {
    title: "Home Cleaning & Chores",
    items: [
      { id: "home_cleaning", label: "Home Cleaning", labelUr: "گھر کی صفائی", icon: Sparkles },
      { id: "deep_cleaning", label: "Deep Cleaning", icon: Sparkles },
      { id: "carpet_cleaning", label: "Sofa & Carpet Cleaning", icon: Sparkles },
      { id: "laundry", label: "Laundry & Dry Cleaning", icon: Shirt },
      { id: "gardening", label: "Gardening & Lawn Care", icon: Leaf },
      { id: "tank_cleaning", label: "Water Tank Cleaning", icon: Droplet },
    ],
  },
  {
    title: "Repairs & Appliances",
    items: [
      { id: "appliance_repair", label: "Appliance Repair", icon: Wrench },
      { id: "mobile_repair", label: "Mobile & Computer Repair", icon: Smartphone },
      { id: "electronics_repair", label: "TV & Electronics Repair", icon: Tv },
    ],
  },
  {
    title: "Automotive",
    items: [
      { id: "mechanic", label: "Auto Mechanic", labelUr: "مکینک", icon: Car },
      { id: "car_wash", label: "Car Wash", icon: Droplet },
      { id: "towing", label: "Towing Service", icon: Truck },
      { id: "bike_repair", label: "Bike Repair", icon: Bike },
    ],
  },
  {
    title: "Personal Care & Beauty",
    items: [
      { id: "salon_women", label: "Women's Salon", labelUr: "خواتین سیلون", icon: Scissors },
      { id: "barber", label: "Men's Barber", labelUr: "حجام", icon: Scissors },
      { id: "spa", label: "Spa & Massage", icon: Heart },
      { id: "mehndi", label: "Mehndi Artist", icon: Feather },
      { id: "makeup_artist", label: "Makeup Artist", icon: Brush },
      { id: "personal_trainer", label: "Personal Trainer", icon: Dumbbell },
    ],
  },
  {
    title: "Professional Services",
    items: [
      { id: "home_tutor", label: "Home Tutor", labelUr: "ٹیوٹر", icon: GraduationCap },
      { id: "lawyer", label: "Lawyer", icon: Scale },
      { id: "accountant", label: "Accountant & Tax", icon: Calculator },
      { id: "interior_designer", label: "Interior Design", icon: Palette },
      { id: "architect", label: "Architect", icon: Ruler },
      { id: "photographer", label: "Photography & Video", icon: Camera },
      { id: "event_planner", label: "Event Planning", icon: PartyPopper },
      { id: "caterer", label: "Catering", icon: UtensilsCrossed },
    ],
  },
  {
    title: "Moving, Logistics & Domestic Help",
    items: [
      { id: "movers", label: "Movers & Packers", icon: Truck },
      { id: "courier", label: "Courier & Delivery", icon: Package },
      { id: "driver", label: "Personal Driver", icon: Car },
      { id: "maid", label: "Domestic Help / Maid", labelUr: "گھریلو ملازمہ", icon: HomeIcon },
      { id: "babysitter", label: "Babysitter & Nanny", icon: Baby },
      { id: "cook", label: "Home Cook / Chef", icon: ChefHat },
      { id: "elderly_care", label: "Elderly Care", icon: HeartHandshake },
    ],
  },
  {
    title: "Security & Pets",
    items: [
      { id: "security_guard", label: "Security Guard", icon: Shield },
      { id: "cctv", label: "CCTV Installation", icon: Video },
      { id: "pet_grooming", label: "Pet Grooming", icon: PawPrint },
      { id: "veterinarian", label: "Veterinary Services", icon: Stethoscope },
    ],
  },
];

const CATEGORIES = CATEGORY_SECTIONS.flatMap((s) => s.items);
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const catLabel = (id, lang) => {
  const c = CATEGORY_BY_ID[id];
  if (!c) return "";
  return lang === "ur" && c.labelUr ? c.labelUr : c.label;
};

const CITIES = [
  "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta",
  "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur", "Sheikhupura",
  "Rahim Yar Khan", "Gujrat", "Sahiwal", "Jhang", "Dera Ghazi Khan", "Kasur", "Okara", "Mardan",
  "Chiniot", "Nawabshah", "Larkana", "Muzaffargarh", "Jhelum", "Abbottabad", "Mingora",
];

const citySlug = (name) => name.toLowerCase().replace(/\s+/g, "-");

const priceLabel = (level) => {
  if (level === 2) return "Rs 800 – 2,000 / visit";
  if (level === 3) return "Rs 1,500 – 4,500 / visit";
  if (level === 4) return "Rs 4,000+ / visit";
  return "Contact for quote";
};

const SEED_LISTINGS = [
  { id: "p1", category: "plumber", name: "Zubair Plumbing Services", area: "Sabzazar, Multan Rd", city: "Lahore", rating: 4.9, ratingCount: 296, phone: "+92 312 4740940", hours: "Open 24 hours", price: priceLabel(null), verified: true, claimedBy: null, review: "Called for kitchen drain cleaning — fast, professional, and cleaned up after the job." },
  { id: "p2", category: "plumber", name: "Khalid Plumber Lahore", area: "Sufiabad Cantt", city: "Lahore", rating: 5.0, ratingCount: 12, phone: "+92 300 1272715", hours: "Open 24 hours", price: priceLabel(3), verified: false, claimedBy: null, review: "Affordable and good quality plumbing, nice team." },
  { id: "p3", category: "plumber", name: "Asif Plumbing Services", area: "Dholanwal, Multan Rd", city: "Lahore", rating: 4.9, ratingCount: 137, phone: "+92 301 5404356", hours: "Open 24 hours", price: priceLabel(3), verified: true, claimedBy: null, review: "Neat washing machine fitting, pipe connections done perfectly with no leakage." },
  { id: "p4", category: "plumber", name: "Plumbing Technical Work", area: "Model Town Link Rd", city: "Lahore", rating: 4.8, ratingCount: 22, phone: "+92 326 6097001", hours: "Open 24 hours", price: priceLabel(null), verified: false, claimedBy: null, review: "Repaired a water tank leak in heavy rain, reasonable price, before-and-after photos shared." },
  { id: "p5", category: "plumber", name: "Arif Plumbing Services", area: "Kot Kamboh, Bund Rd", city: "Lahore", rating: 4.9, ratingCount: 199, phone: "+92 300 4312739", hours: "8:00 AM – 10:00 PM", price: priceLabel(null), verified: true, claimedBy: null, review: "Explained charges upfront for a bathroom leak, felt fair, no hidden costs." },
  { id: "e1", category: "electrician", name: "Electrician Lahore", area: "Gulberg III", city: "Lahore", rating: 5.0, ratingCount: 27, phone: "+92 307 4725279", hours: "Open 24 hours", price: priceLabel(null), verified: true, claimedBy: null, review: "Fast response, did hall light installation, no extra charges." },
  { id: "e2", category: "electrician", name: "Sooper Electricians", area: "Gulshan-e-Yaseen Colony", city: "Lahore", rating: 4.9, ratingCount: 78, phone: "+92 336 3865932", hours: "Open 24 hours", price: priceLabel(null), verified: false, claimedBy: null, review: "Changed exhaust fan, duct wiring, breaker install — rates were lowest of three quotes." },
  { id: "e3", category: "electrician", name: "Numan Electrician", area: "MM Alam Rd, Gulberg III", city: "Lahore", rating: 5.0, ratingCount: 5, phone: "+92 307 4480536", hours: "Open 24 hours", price: priceLabel(null), verified: false, claimedBy: null, review: "Reliable, on-time service." },
  { id: "e4", category: "electrician", name: "Electrician Suleman Home Service", area: "Main Market, Gulberg", city: "Lahore", rating: 5.0, ratingCount: 3, phone: "+92 309 4511610", hours: "By appointment", price: priceLabel(null), verified: false, claimedBy: null, review: "Professional and reasonably priced electrician in Gulberg." },
  { id: "a1", category: "ac_repair", name: "Supreme AC Service Lahore", area: "Block Q, Johar Town", city: "Lahore", rating: 4.9, ratingCount: 46, phone: "+92 337 6842491", hours: "Open 24 hours", price: priceLabel(null), verified: true, claimedBy: null, review: "Affordable service, cooling restored quickly and neatly." },
  { id: "a2", category: "ac_repair", name: "Technical Expert Repair & Services", area: "Bedian Rd, DHA", city: "Lahore", rating: 4.7, ratingCount: 77, phone: "+92 300 5738374", hours: "Open 24 hours", price: priceLabel(3), verified: true, claimedBy: null, review: "Experienced team with modern tools, fair pricing, came back to check the work." },
  { id: "a3", category: "ac_repair", name: "Zain AC Service & Repair Center", area: "Ichhra", city: "Lahore", rating: 4.8, ratingCount: 124, phone: "+92 300 6514323", hours: "Open 24 hours", price: priceLabel(null), verified: true, claimedBy: null, review: "Fixed a gas leakage issue, technician arrived quickly." },
  { id: "a4", category: "ac_repair", name: "Master Cool AC Solutions", area: "Township, Sector A1", city: "Lahore", rating: 5.0, ratingCount: 21, phone: "+92 344 6291674", hours: "Open 24 hours", price: priceLabel(null), verified: false, claimedBy: null, review: "On time, full service, explained maintenance clearly." },
  { id: "a5", category: "ac_repair", name: "CoolCare", area: "Ichhra", city: "Lahore", rating: 4.9, ratingCount: 115, phone: "+92 300 5858323", hours: "Open 24 hours", price: priceLabel(null), verified: false, claimedBy: null, review: "Found and fixed a gas leak I didn't know I had — mixed reviews on scheduling, worth confirming appointment time." },
];

const REPORT_REASONS = ["Wrong contact / address", "Unresponsive to bookings", "Poor service quality", "Suspected spam listing", "Other"];

const AUTO_REPLIES = [
  "Thanks for reaching out! What's the issue you're facing?",
  "Sure, I can come by today. What area are you in?",
  "Got it — I'll need to take a look first to give you an exact price.",
  "I'm available this evening after 6pm, does that work?",
];

// ---------------------------------------------------------------------------
// Minimal i18n. Only chrome strings are covered — see the note above
// CATEGORY_SECTIONS about category labels. Add keys here as you translate
// more of the UI; anything missing falls back to English.
// ---------------------------------------------------------------------------
const STRINGS = {
  en: {
    findServiceIn: "find a service in",
    searchPlaceholder: "Search plumber, electrician, salon...",
    footnoteHome: "Listings are sourced from public Google Maps business profiles. Verified badges mean a provider has claimed and confirmed their profile.",
    navHome: "Home", navChats: "Chats", navAccount: "Account",
    back: "Back",
    allServices: "All services",
    inCity: "in",
    call: "Call", chat: "Chat",
    recentReview: "Recent review",
    claimBusiness: "This is my business — claim it",
    pendingReview: "Pending review",
    verified: "Verified",
    claimedBy: "Claimed by",
    reportListing: "Report this listing",
    noConversations: "No conversations yet — message a provider from their listing page.",
    demoChatBanner: "Demo chat — replies here are simulated, not a real provider yet.",
    typeMessage: "Type a message",
    account: "Account",
    appLanguage: "App language",
    addYourBusiness: "Add your business",
    pendingApprovals: "Pending approvals (admin view, for testing)",
    noPending: "Nothing waiting on review.",
    approve: "Approve", reject: "Reject",
    yourClaimed: "Your claimed listings",
    reportQueue: "Report queue (admin view, for testing)",
    onboardName: "Your name",
    onboardPhone: "Phone number",
    onboardRole: "I am a",
    customer: "Customer",
    provider: "Service provider",
    continue: "Continue",
    onboardFootnote: "No password needed for this test build — a real launch would verify this phone number with an OTP.",
  },
  ur: {
    findServiceIn: "میں سروس تلاش کریں",
    searchPlaceholder: "پلمبر، الیکٹریشن، سیلون تلاش کریں...",
    footnoteHome: "فہرستیں عوامی گوگل میپس پروفائلز سے لی گئی ہیں۔ تصدیق شدہ نشان کا مطلب ہے کاروبار نے اپنا پروفائل دعویٰ اور تصدیق کر لیا ہے۔",
    navHome: "ہوم", navChats: "چیٹس", navAccount: "اکاؤنٹ",
    back: "واپس",
    allServices: "تمام سروسز",
    inCity: "میں",
    call: "کال کریں", chat: "چیٹ کریں",
    recentReview: "حالیہ ریویو",
    claimBusiness: "یہ میرا کاروبار ہے — دعویٰ کریں",
    pendingReview: "جائزے کے منتظر",
    verified: "تصدیق شدہ",
    claimedBy: "دعویٰ کنندہ",
    reportListing: "اس فہرست کی رپورٹ کریں",
    noConversations: "ابھی کوئی گفتگو نہیں — کسی سروس فراہم کنندہ کو پیغام بھیجیں۔",
    demoChatBanner: "ڈیمو چیٹ — یہاں جوابات فرضی ہیں، ابھی حقیقی فراہم کنندہ نہیں۔",
    typeMessage: "پیغام لکھیں",
    account: "اکاؤنٹ",
    appLanguage: "ایپ کی زبان",
    addYourBusiness: "اپنا کاروبار شامل کریں",
    pendingApprovals: "زیرِ التوا منظوری (ٹیسٹنگ کے لیے ایڈمن ویو)",
    noPending: "جائزے کے لیے کچھ بھی منتظر نہیں۔",
    approve: "منظور کریں", reject: "مسترد کریں",
    yourClaimed: "آپ کی دعویٰ شدہ فہرستیں",
    reportQueue: "رپورٹ قطار (ٹیسٹنگ کے لیے ایڈمن ویو)",
    onboardName: "آپ کا نام",
    onboardPhone: "فون نمبر",
    onboardRole: "میں ہوں",
    customer: "گاہک",
    provider: "سروس فراہم کنندہ",
    continue: "جاری رکھیں",
    onboardFootnote: "اس ٹیسٹ بلڈ میں پاس ورڈ درکار نہیں — حقیقی لانچ میں یہ فون نمبر OTP سے تصدیق ہو گا۔",
  },
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("home");
  const [city, setCity] = useState("Lahore");
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [activeListing, setActiveListing] = useState(null);
  const [listings, setListings] = useState(SEED_LISTINGS); // local claim/demo overrides + self-submitted
  const [liveResults, setLiveResults] = useState(null);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | loading | live | empty | error
  const [conversations, setConversations] = useState({}); // listingId -> [{from, text, ts}]
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [authUid, setAuthUid] = useState(null); // real Supabase auth uid, used by chat
  const [authError, setAuthError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;

  // Sign in anonymously so there's a real auth.uid() for RLS to key off of.
  // onAuthStateChange is the source of truth for authUid (not the direct
  // signInAnonymously response) so React 18 StrictMode's double-invoke of
  // this effect can't leave authUid pointing at a stale/overwritten session.
  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) setAuthUid(session.user.id);
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) return; // onAuthStateChange above already handles setting it
      const { error } = await supabase.auth.signInAnonymously();
      if (error) { console.error("anonymous sign-in failed", error); if (!cancelled) { setAuthError(error.message); setReady(true); } }
    })();

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (screen !== "results") return;
    let cancelled = false;
    setLiveStatus("loading");
    fetchLiveProviders(citySlug(city), category)
      .then((rows) => {
        if (cancelled) return;
        setLiveResults(rows);
        setLiveStatus(rows.length ? "live" : "empty");
      })
      .catch(() => { if (!cancelled) { setLiveResults(null); setLiveStatus("error"); } });
    return () => { cancelled = true; };
  }, [screen, city, category]);

  useEffect(() => {
    if (!authUid) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", authUid).maybeSingle();
      if (p?.full_name) { setProfile(p); setLang(p.lang || "en"); }
      setReady(true);
    })();
  }, [authUid]);

  const refreshUnreadCount = async (uid) => {
    if (!uid) return;
    const [asCustomer, asProvider] = await Promise.all([
      supabase.from("conversations").select("id").eq("customer_id", uid),
      supabase.from("conversations").select("id, providers!inner(claimed_by)").eq("providers.claimed_by", uid),
    ]);
    const ids = [...(asCustomer.data || []), ...(asProvider.data || [])].map((c) => c.id);
    if (ids.length === 0) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .neq("sender_id", uid)
      .is("read_at", null);
    setUnreadCount(count || 0);
  };

  // Keep the unread badge live: recheck whenever a new message lands
  // anywhere, and whenever the person navigates (since opening a chat
  // marks its messages read, which this won't otherwise notice).
  useEffect(() => {
    if (!authUid) return;
    refreshUnreadCount(authUid);
    const channel = supabase
      .channel(`unread:${authUid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refreshUnreadCount(authUid))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authUid]);

  useEffect(() => {
    if (screen !== "chat") refreshUnreadCount(authUid);
  }, [screen]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const saveProfile = async (p) => {
    const { error } = await supabase.from("profiles").insert({ id: authUid, ...p });
    if (error) { setStorageWarning(true); return; }
    setProfile(p);
  };

  const changeLang = async (l) => {
    setLang(l);
    await supabase.from("profiles").update({ lang: l }).eq("id", authUid);
  };

  const handleLogout = async () => {
    setReady(false);
    setProfile(null);
    setAuthUid(null);
    setScreen("home");
    setActiveListing(null);
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) { console.error("re-auth after logout failed", error); setAuthError(error.message); setReady(true); return; }
    setAuthUid(data.user.id);
  };

  const saveListings = (next) => {
    setListings(next);
  };

  const saveConversations = (next) => {
    setConversations(next);
  };

  const sendMessage = (listing, text) => {
    const thread = conversations[listing.id] || [];
    const withMine = [...thread, { from: "me", text, ts: Date.now() }];
    saveConversations({ ...conversations, [listing.id]: withMine });
    // demo-only: simulate the provider replying, so chat is testable end-to-end
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setConversations((prev) => {
        const th = prev[listing.id] || [];
        return { ...prev, [listing.id]: [...th, { from: "them", text: reply, ts: Date.now() }] };
      });
    }, 1100);
  };

  const submitReport = async (listing, reason, notes) => {
    const { error } = await supabase.from("reports").insert({
      provider_id: listing.id, reason, notes, reporter_id: authUid,
    });
    if (error) { showToast("Couldn't submit report"); return; }
    showToast("Report submitted — thanks for flagging this");
  };

  // Claim no longer flips verified:true immediately. It records a pending
  // claim with whatever proof was collected, and an approve/reject queue
  // (Account screen) is what actually publishes it.
  const submitClaim = async (listing, proof) => {
    const { error } = await supabase
      .from("providers")
      .update({ claimed_by: authUid, claim_status: "pending", claim_proof: proof })
      .eq("id", listing.id);
    if (error) { showToast("Couldn't submit claim"); return; }
    setActiveListing({ ...listing, claimedBy: profile?.full_name || "Owner", claimStatus: "pending" });
    showToast("Claim submitted — pending review before it's marked verified");
  };

  const submitNewBusiness = async (data) => {
    const [{ data: cat, error: catErr }, { data: cty, error: ctyErr }] = await Promise.all([
      supabase.from("categories").select("id").eq("slug", data.category).maybeSingle(),
      supabase.from("cities").select("id").eq("slug", citySlug(data.city)).maybeSingle(),
    ]);
    if (catErr || ctyErr || !cat || !cty) { showToast("Couldn't match category or city"); return; }

    const { error } = await supabase.from("providers").insert({
      name: data.name, category_id: cat.id, area: data.area,
      city_id: cty.id, phone: data.phone, hours: { raw: data.hours },
      price_label: data.price, claimed_by: authUid, claim_status: "pending",
      self_submitted: true, claim_proof: { businessPhoto: data.businessPhoto, idPhoto: data.idPhoto },
    });
    if (error) { showToast("Couldn't submit business"); return; }
    showToast("Business submitted — it'll appear once reviewed");
  };

  const reviewClaim = async (listing, decision) => {
  const next = listings.map((l) => {
    if (l.id !== listing.id) return l;
    if (decision === "approve") return { ...l, claimStatus: "approved", verified: true };
    return { ...l, claimStatus: "rejected", verified: false };
  });
  await saveListings(next);
};

  const overridesById = Object.fromEntries(listings.map((l) => [l.id, l]));
  const source = liveStatus === "live" && liveResults ? liveResults : SEED_LISTINGS;
  const selfSubmittedExtra = listings.filter((l) => l.selfSubmitted);
  const q = query.trim().toLowerCase();
  const filtered = [...source, ...selfSubmittedExtra]
    .map((l) => (overridesById[l.id] ? { ...l, ...overridesById[l.id] } : l))
    .filter((l, idx, arr) => arr.findIndex((x) => x.id === l.id) === idx) // de-dupe
    .filter((l) => {
      if (l.city !== city) return false;
      if (category && l.category !== category) return false;
      // self-submitted businesses only go public once approved
      if (l.selfSubmitted && l.claimStatus !== "approved") return false;
      if (q) {
        const label = catLabel(l.category, "en").toLowerCase();
        const haystack = `${l.name} ${l.area} ${label}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

  const pendingItems = listings.filter((l) => l.claimStatus === "pending");

  const rtl = lang === "ur";

  if (!ready) {
    return (
      <div style={styles.phone}>
        <GlobalStyle />
        <div style={styles.splash}><div className="khidmat-brand" style={styles.brand}>Khidmat</div></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.phone}>
        <GlobalStyle />
        <div style={styles.splash}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div className="khidmat-brand" style={styles.brand}>Khidmat</div>
            <div style={{ fontSize: 13, color: "#a14545", marginTop: 12 }}>Couldn't connect: {authError}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.phone}>
        <GlobalStyle />
        <Onboarding onDone={saveProfile} lang={lang} setLang={changeLang} t={t} authReady={!!authUid} />
      </div>
    );
  }

  return (
    <div style={styles.phone} dir={rtl ? "rtl" : "ltr"}>
      <GlobalStyle rtl={rtl} />

      <div style={styles.body}>
        {screen === "home" && (
          <Home city={city} setCity={setCity} onPickCategory={(id) => { setCategory(id); setScreen("results"); }} query={query} setQuery={setQuery} onSearch={() => setScreen("results")} profile={profile} lang={lang} t={t} />
        )}
        {screen === "results" && (
          <Results city={city} category={category} setCategory={setCategory} listings={filtered} liveStatus={liveStatus} onBack={() => setScreen("home")} onOpen={(l) => { setActiveListing(l); setScreen("detail"); }} lang={lang} t={t} onAddBusiness={() => setScreen("addBusiness")} />
        )}
        {screen === "detail" && activeListing && (
          <Detail listing={listings.find((l) => l.id === activeListing.id) || activeListing} profile={profile} onBack={() => setScreen("results")} onChat={() => setScreen("chat")} onReport={(reason, notes) => submitReport(activeListing, reason, notes)} onClaim={(proof) => submitClaim(activeListing, proof)} t={t} />
        )}
        {screen === "chat" && activeListing && (
          activeListing._live ? (
            <RealChat listing={activeListing.listing || activeListing} conversationId={activeListing.conversationId} title={activeListing.title} authUid={authUid} onBack={() => setScreen(activeListing.fromChats ? "chats" : "detail")} t={t} />
          ) : (
            <Chat listing={activeListing} messages={conversations[activeListing.id] || []} onSend={(text) => sendMessage(activeListing, text)} onBack={() => setScreen("detail")} t={t} />
          )
        )}
        {screen === "chats" && (
          <ChatList listings={listings} conversations={conversations} authUid={authUid} onOpen={(l) => { setActiveListing(l); setScreen("chat"); }} onOpenReal={(th) => { setActiveListing({ _live: true, conversationId: th.id, title: th.title, fromChats: true }); setScreen("chat"); }} t={t} />
        )}
        {screen === "addBusiness" && (
          <AddBusinessForm onBack={() => setScreen("account")} onSubmit={async (data) => { await submitNewBusiness(data); setScreen("account"); }} defaultCity={city} t={t} />
        )}
        {screen === "account" && (
          <Account profile={profile} reports={reports} listings={listings} pendingItems={pendingItems} onReview={reviewClaim} lang={lang} setLang={changeLang} t={t} onAddBusiness={() => setScreen("addBusiness")} onLogout={handleLogout} />
        )}
      </div>

            {screen !== "chat" && screen !== "addBusiness" && (
        <BottomNav screen={screen} setScreen={setScreen} t={t} unreadCount={unreadCount} />
      )}

      {toast && <div style={styles.toast} role="status">{toast}</div>}
      {storageWarning && <div style={styles.toast} role="alert">Couldn't save — check your connection</div>}
    </div>
  );
}

function GlobalStyle({ rtl }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');

      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { height: 100%; overscroll-behavior-y: none; }
      button { font-family: inherit; cursor: pointer; touch-action: manipulation; transition: transform 0.12s ease, background-color 0.15s ease, border-color 0.15s ease; }
      button:disabled { cursor: not-allowed; opacity: 0.5; }
      button:active:not(:disabled) { transform: scale(0.97); }
      button:focus-visible { outline: 2px solid #1f6f5c; outline-offset: 2px; }
      input, textarea, select { font-family: inherit; font-size: 16px; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      input:focus-visible, textarea:focus-visible, select:focus-visible { outline: none; border-color: #1f6f5c; box-shadow: 0 0 0 3px rgba(31,111,92,0.14); }
      ::-webkit-scrollbar { width: 0; height: 0; }
      :root { --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px); }

      .khidmat-brand { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.01em; }

      .khidmat-card { transition: border-color 0.15s ease, background-color 0.15s ease; }
      .khidmat-card:hover { border-color: #bcd4cc; }
      .khidmat-card:active { background-color: #f5f3ec; }

      .khidmat-link-btn { transition: transform 0.12s ease, background-color 0.15s ease; }
      .khidmat-link-btn:active { transform: scale(0.97); background-color: #f5f3ec; }
      .khidmat-link-btn:focus-visible { outline: 2px solid #1f6f5c; outline-offset: 2px; }

      .khidmat-chip:hover { border-color: #1f6f5c; color: #1f6f5c; }

      .khidmat-cat-icon { transition: background-color 0.15s ease; }
      .khidmat-cat-card:hover .khidmat-cat-icon { background: #1f6f5c; }
      .khidmat-cat-card:hover .khidmat-cat-icon svg { stroke: #fff; }

      @media (max-width: 480px) {
        .khidmat-phone {
          border: none !important;
          border-radius: 0 !important;
          max-width: 100% !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
        }
      }

      @keyframes shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
      .khidmat-skeleton {
        background: linear-gradient(90deg, #f0efe9 25%, #e8e6dd 37%, #f0efe9 63%);
        background-size: 400px 100%;
        animation: shimmer 1.4s ease infinite;
      }
      ${rtl ? `body, .khidmat-phone { font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", -apple-system, sans-serif; }` : ""}
    `}</style>
  );
}

function LangSwitch({ lang, setLang, compact }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button style={lang === "en" ? styles.langBtnActive : styles.langBtn} onClick={() => setLang("en")}>English</button>
      <button style={lang === "ur" ? styles.langBtnActive : styles.langBtn} onClick={() => setLang("ur")}>اردو</button>
    </div>
  );
}

function Onboarding({ onDone, lang, setLang, t, authReady }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  return (
    <div style={styles.screen}>
      <div style={{ padding: "40px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="khidmat-brand" style={styles.brand}>Khidmat</div>
          <div style={styles.brandSub}>Find trusted local services across Pakistan.</div>
        </div>
        <LangSwitch lang={lang} setLang={setLang} />
      </div>
      <div style={{ padding: "28px 24px", flex: 1 }}>
        <div style={styles.sectionLabel}>{t("onboardName")}</div>
        <input style={styles.textInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" autoComplete="name" />
        <div style={styles.sectionLabel}>{t("onboardPhone")}</div>
        <input style={styles.textInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" type="tel" inputMode="tel" autoComplete="tel" />
        <div style={styles.sectionLabel}>{t("onboardRole")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={role === "customer" ? styles.roleBtnActive : styles.roleBtn} onClick={() => setRole("customer")}>{t("customer")}</button>
          <button style={role === "provider" ? styles.roleBtnActive : styles.roleBtn} onClick={() => setRole("provider")}>{t("provider")}</button>
        </div>
      </div>
      <div style={{ padding: 24, paddingBottom: "calc(24px + var(--safe-bottom))" }}>
  <button style={{ ...styles.actionBtnPrimary, opacity: name && phone && authReady ? 1 : 0.5 }} disabled={!name || !phone || !authReady} onClick={() => onDone({ full_name: name, phone, role })}>{t("continue")}</button>
  <div style={styles.footnoteCenter}>{t("onboardFootnote")}</div>
</div>
    </div>
  );
}

function BottomNav({ screen, setScreen, t, unreadCount }) {
  const items = [
    { id: "home", label: t("navHome"), icon: HomeIcon },
    { id: "chats", label: t("navChats"), icon: MessageSquare },
    { id: "account", label: t("navAccount"), icon: User },
  ];
  const active = screen === "results" || screen === "detail" ? "home" : screen;
  return (
    <div style={styles.bottomNav}>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button key={it.id} style={styles.navBtn} onClick={() => setScreen(it.id)} aria-label={it.label + (it.id === "chats" && unreadCount > 0 ? `, ${unreadCount} unread` : "")} aria-current={isActive}>
            <span style={{ position: "relative" }}>
              <Icon size={20} color={isActive ? "#1f6f5c" : "#9a9a9a"} />
              {it.id === "chats" && unreadCount > 0 && (
                <span style={styles.navBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </span>
            <span style={{ ...styles.navLabel, color: isActive ? "#1f6f5c" : "#9a9a9a" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Home({ city, setCity, onPickCategory, query, setQuery, onSearch, profile, lang, t }) {
  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={styles.eyebrow}>Hi {profile.full_name.split(" ")[0]}, {t("findServiceIn")}</div>
            <CitySwitcher city={city} setCity={setCity} />
          </div>
        </div>
      </div>

      <div style={styles.searchBar}>
        <Search size={18} color="#8a8a8a" />
        <input style={styles.searchInput} placeholder={t("searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()} enterKeyHint="search" aria-label="Search services" />
      </div>

      {CATEGORY_SECTIONS.map((section) => (
        <div key={section.title}>
          <div style={styles.sectionLabel}>{section.title}</div>
          <div style={styles.grid}>
            {section.items.map((c) => {
              const Icon = c.icon;
              return (
                <button key={c.id} className="khidmat-cat-card" style={styles.catCard} onClick={() => onPickCategory(c.id)}>
                  <span className="khidmat-cat-icon" style={styles.catIconBadge}>
                    <Icon size={18} color="#1f6f5c" style={{ transition: "stroke 0.15s ease" }} />
                  </span>
                  <span style={styles.catLabel}>{lang === "ur" && c.labelUr ? c.labelUr : c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={styles.footnote}>{t("footnoteHome")}</div>
    </div>
  );
}

function CitySwitcher({ city, setCity }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const matches = CITIES.filter((c) => c.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={{ position: "relative" }}>
      <button style={styles.cityBtn} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Change city, currently ${city}`}>
        <MapPin size={18} color="#1f6f5c" />
        <span style={styles.cityText}>{city}</span>
      </button>
      {open && (
        <>
          <div style={styles.dropdownScrim} onClick={() => setOpen(false)} />
          <div style={styles.cityDropdown}>
            <input autoFocus style={styles.citySearchInput} placeholder="Search cities..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div style={styles.cityOptionList}>
              {matches.map((c) => (
                <div key={c} style={styles.cityOption} onClick={() => { setCity(c); setOpen(false); setFilter(""); }}>{c}</div>
              ))}
              {matches.length === 0 && <div style={styles.cityOption}>No matches</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Results({ city, category, setCategory, listings, liveStatus, onBack, onOpen, lang, t, onAddBusiness }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const statusText = {
    loading: "Checking live database...",
    live: "Live data from Supabase",
    empty: "No synced data for this yet — showing demo listings",
    error: "Couldn't reach Supabase — showing demo listings",
    idle: "Demo listings",
  }[liveStatus];
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack} aria-label={t("back")}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{cat ? (lang === "ur" && cat.labelUr ? cat.labelUr : cat.label) : t("allServices")} {t("inCity")} {city}</div>
      </div>
      <div style={styles.liveBadgeRow}>
        <span style={liveStatus === "live" ? styles.liveDotOn : styles.liveDotOff} />
        <span style={styles.liveBadgeText}>{statusText}</span>
      </div>
      <div style={styles.chipsRow}>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="khidmat-chip" onClick={() => setCategory(c.id)} style={category === c.id ? styles.chipActive : styles.chip}>{lang === "ur" && c.labelUr ? c.labelUr : c.label}</button>
        ))}
      </div>
      <div style={styles.list}>
        {liveStatus === "loading" && [0, 1, 2].map((i) => (
          <div key={i} style={styles.listingCard}>
            <div className="khidmat-skeleton" style={{ height: 16, width: "60%", borderRadius: 6, marginBottom: 8 }} />
            <div className="khidmat-skeleton" style={{ height: 12, width: "40%", borderRadius: 6, marginBottom: 10 }} />
            <div className="khidmat-skeleton" style={{ height: 20, width: "50%", borderRadius: 6 }} />
          </div>
        ))}
        {liveStatus !== "loading" && listings.length === 0 && (
          <div style={styles.empty}>
            No verified providers here yet. New listings are added as we onboard more businesses in {city}.
            <button style={styles.addBusinessLink} onClick={onAddBusiness}><Plus size={14} /> {t("addYourBusiness")}</button>
          </div>
        )}
        {liveStatus !== "loading" && listings.map((l) => (
          <button key={l.id} className="khidmat-card" style={styles.listingCard} onClick={() => onOpen(l)}>
            <div style={styles.listingTop}>
              <div style={styles.listingName}>{l.name}</div>
              {l.verified ? <ShieldCheck size={16} color="#1f6f5c" /> : l.claimStatus === "pending" ? <span style={styles.pendingPill}>{t("pendingReview")}</span> : null}
            </div>
            <div style={styles.listingArea}><MapPin size={12} /> {l.area}</div>
            <div style={styles.listingMeta}>
              <span style={styles.ratingPill}><Star size={12} fill="#c98a1f" color="#c98a1f" /> {l.rating ?? "—"} ({l.ratingCount})</span>
              <span style={styles.pricePill}>{l.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Detail({ listing, profile, onBack, onChat, onReport, onClaim, t }) {
  const [showReport, setShowReport] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const canClaim = profile.role === "provider" && !listing.claimedBy && listing._live;
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack} aria-label={t("back")}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{listing.name}</div>
      </div>
      <div style={styles.detailBody}>
        <div style={styles.detailHeadRow}>
          <div>
            <div className="khidmat-brand" style={styles.detailName}>{listing.name}</div>
            <div style={styles.listingArea}><MapPin size={12} /> {listing.area}, {listing.city}</div>
          </div>
          {listing.verified ? (
            <span style={styles.verifiedBadge}><ShieldCheck size={13} /> {t("verified")}</span>
          ) : listing.claimStatus === "pending" ? (
            <span style={styles.pendingBadge}><Clock size={13} /> {t("pendingReview")}</span>
          ) : null}
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statValue}><Star size={14} fill="#c98a1f" color="#c98a1f" /> {listing.rating ?? "—"}</div>
            <div style={styles.statLabel}>{listing.ratingCount} ratings</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}><Clock size={14} /> {listing.hours}</div>
            <div style={styles.statLabel}>Availability</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{listing.price}</div>
            <div style={styles.statLabel}>Estimated price</div>
          </div>
        </div>

        <div style={styles.sectionLabel}>{t("recentReview")}</div>
        <div style={styles.reviewCard}>"{listing.review}"</div>

        <div style={styles.actionsRow}>
          <a href={`tel:${listing.phone}`} className="khidmat-link-btn" style={styles.actionBtnSecondary}><Phone size={16} /> {t("call")}</a>
          <button style={styles.actionBtnPrimary} onClick={onChat}><MessageCircle size={16} /> {t("chat")}</button>
        </div>

        {canClaim && (
          <button style={styles.claimBtn} onClick={() => setShowClaim(true)}><CheckCircle2 size={15} /> {t("claimBusiness")}</button>
        )}
        {listing.claimedBy && listing.claimStatus === "pending" && <div style={styles.claimedNote}>{t("claimedBy")} {listing.claimedBy} — {t("pendingReview").toLowerCase()}</div>}
        {listing.claimedBy && listing.claimStatus !== "pending" && listing.verified && <div style={styles.claimedNote}>{t("claimedBy")} {listing.claimedBy}</div>}

        {listing._live && (
          <button style={styles.reportLink} onClick={() => setShowReport(true)}><Flag size={14} /> {t("reportListing")}</button>
        )}
      </div>
      {showReport && <ReportModal listing={listing} onClose={() => setShowReport(false)} onSubmit={(reason, notes) => { onReport(reason, notes); setShowReport(false); }} />}
      {showClaim && <ClaimModal listing={listing} onClose={() => setShowClaim(false)} onSubmit={(proof) => { onClaim(proof); setShowClaim(false); }} />}
    </div>
  );
}

// 3-step claim flow: phone-code check (mocked — see SECURITY NOTE at top of
// file), proof-of-business photo, ID photo. Submitting sets claimStatus to
// "pending", never verified directly.
function ClaimModal({ listing, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [genCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [businessPhoto, setBusinessPhoto] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const maskedPhone = listing.phone ? listing.phone.replace(/\d(?=\d{3})/g, "•") : "the number on file";

  const checkCode = () => {
    if (enteredCode.trim() === genCode) { setCodeError(""); setStep(2); }
    else setCodeError("That code doesn't match. Try again.");
  };

  const handleUpload = async (setter, file) => {
    if (!file) return;
    setBusy(true);
    try { setter(await fileToDataUrl(file)); } finally { setBusy(false); }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHandle} />
        <div style={styles.modalHead}>
          <div style={styles.modalTitle}>Claim {listing.name}</div>
          <button style={styles.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {step === 1 && (
          <div>
            <div style={styles.claimStepNote}>
              <AlertTriangle size={14} color="#a17d1f" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Demo only: this code is shown here because there's no SMS gateway wired up yet. In production it would be texted to {maskedPhone}, never shown on screen.</span>
            </div>
            <div style={styles.sectionLabel}>Verification code</div>
            <div style={styles.otpDisplay}>{genCode}</div>
            <input style={styles.textInput} value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} placeholder="Enter the 4-digit code" inputMode="numeric" maxLength={4} />
            {codeError && <div style={styles.errorText}>{codeError}</div>}
            <button style={styles.actionBtnPrimary} disabled={enteredCode.length !== 4} onClick={checkCode}>Verify code</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={styles.sectionLabel}>Photo proof of the business</div>
            <PhotoPicker value={businessPhoto} onChange={(f) => handleUpload(setBusinessPhoto, f)} label="Upload a shop-front or work photo" />
            <div style={styles.sectionLabel}>Owner ID (CNIC or business license)</div>
            <PhotoPicker value={idPhoto} onChange={(f) => handleUpload(setIdPhoto, f)} label="Upload an ID photo" />
            <div style={styles.claimStepNote}>
              <ShieldCheck size={14} color="#1f6f5c" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Kept private, used only to review this claim.</span>
            </div>
            <button style={{ ...styles.actionBtnPrimary, opacity: businessPhoto && idPhoto && !busy ? 1 : 0.5 }} disabled={!businessPhoto || !idPhoto || busy} onClick={() => setStep(3)}>Continue</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
              <Clock size={28} color="#1f6f5c" />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Ready to submit for review</div>
              <div style={{ fontSize: 12.5, color: "#8a8a8a", marginTop: 6, lineHeight: 1.5 }}>
                This won't show as "Verified" until someone reviews the code check and the photos you uploaded.
              </div>
            </div>
            <button style={styles.actionBtnPrimary} onClick={() => onSubmit({ businessPhoto, idPhoto, phoneCodeConfirmed: true })}>Submit claim</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoPicker({ value, onChange, label }) {
  const inputRef = useRef(null);
  return (
    <div style={styles.photoPicker} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0])} />
      {value ? (
        <img src={value} alt="" style={styles.photoPreview} />
      ) : (
        <div style={styles.photoPickerEmpty}>
          <ImagePlus size={20} color="#9a9a9a" />
          <span style={{ fontSize: 12, color: "#9a9a9a", marginTop: 6, textAlign: "center" }}>{label}</span>
        </div>
      )}
    </div>
  );
}

function AddBusinessForm({ onBack, onSubmit, defaultCity, t }) {
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0].id, area: "", city: defaultCity, phone: "", hours: "", price: "" });
  const [businessPhoto, setBusinessPhoto] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleUpload = async (setter, file) => {
    if (!file) return;
    setBusy(true);
    try { setter(await fileToDataUrl(file)); } finally { setBusy(false); }
  };

  const canSubmit = form.name && form.area && form.phone && businessPhoto && idPhoto && !busy;

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack} aria-label={t("back")}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{t("addYourBusiness")}</div>
      </div>
      <div style={{ padding: "16px 18px 32px", flex: 1, overflowY: "auto" }}>
        <div style={styles.sectionLabel}>Business name</div>
        <input style={styles.textInput} value={form.name} onChange={set("name")} placeholder="e.g. Sultan Electric Works" />

        <div style={styles.sectionLabel}>Category</div>
        <select style={styles.selectInput} value={form.category} onChange={set("category")}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <div style={styles.sectionLabel}>Area / neighborhood</div>
        <input style={styles.textInput} value={form.area} onChange={set("area")} placeholder="e.g. Johar Town" />

        <div style={styles.sectionLabel}>City</div>
        <select style={styles.selectInput} value={form.city} onChange={set("city")}>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={styles.sectionLabel}>Phone number</div>
        <input style={styles.textInput} value={form.phone} onChange={set("phone")} placeholder="03xx xxxxxxx" type="tel" inputMode="tel" />

        <div style={styles.sectionLabel}>Hours (optional)</div>
        <input style={styles.textInput} value={form.hours} onChange={set("hours")} placeholder="e.g. 9am – 9pm" />

        <div style={styles.sectionLabel}>Estimated price (optional)</div>
        <input style={styles.textInput} value={form.price} onChange={set("price")} placeholder="e.g. Rs 1,000 – 3,000 / visit" />

        <div style={styles.sectionLabel}>Photo of the business or work</div>
        <PhotoPicker value={businessPhoto} onChange={(f) => handleUpload(setBusinessPhoto, f)} label="Upload a shop-front or work photo" />
        <div style={{ height: 12 }} />
        <div style={styles.sectionLabel}>Owner ID (CNIC or business license)</div>
        <PhotoPicker value={idPhoto} onChange={(f) => handleUpload(setIdPhoto, f)} label="Upload an ID photo" />

        <div style={styles.claimStepNote}>
          <AlertTriangle size={14} color="#a17d1f" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Your listing stays private until it's reviewed and approved.</span>
        </div>

        <button style={{ ...styles.actionBtnPrimary, marginTop: 16, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit} onClick={() => onSubmit({ ...form, businessPhoto, idPhoto })}>
          Submit for review
        </button>
      </div>
    </div>
  );
}

function ReportModal({ listing, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [notes, setNotes] = useState("");
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHandle} />
        <div style={styles.modalHead}>
          <div style={styles.modalTitle}>Report {listing.name}</div>
          <button style={styles.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div style={styles.sectionLabel}>Reason</div>
        {REPORT_REASONS.map((r) => (
          <label key={r} style={styles.radioRow}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
        <div style={styles.sectionLabel}>Details (optional)</div>
        <textarea style={styles.textarea} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the review team should know..." />
        <button style={styles.actionBtnPrimary} onClick={() => onSubmit(reason, notes)}>Submit report</button>
      </div>
    </div>
  );
}

// Real, persisted, two-way chat for listings that came from the live
// Supabase table. Finds-or-creates a conversation between this device's
// anon uid and the listing, loads history, then subscribes to Realtime for
// new rows. If the listing has no ownerUid yet, sending still works and
// still saves — there just isn't anyone signed in to read it yet.
function RealChat({ listing, authUid, conversationId: presetConversationId, title, onBack, t }) {
  const [conversationId, setConversationId] = useState(presetConversationId || null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (!authUid) return; // wait for anonymous sign-in to finish
    let channel;
    let cancelled = false;

    (async () => {
      setLoading(true);
      let convId = presetConversationId;

      // Only find-or-create when opened as a customer starting a new thread.
      // Provider-side opens always pass an existing conversationId directly.
      if (!convId && listing) {
        const { data: existing, error: findErr } = await supabase
          .from("conversations")
          .select("id")
          .eq("provider_id", listing.id)
          .eq("customer_id", authUid)
          .maybeSingle();
        if (findErr) console.error(findErr);

        convId = existing?.id;
        if (!convId) {
          const { data: created, error: createErr } = await supabase
            .from("conversations")
            .insert({ provider_id: listing.id, customer_id: authUid })
            .select("id")
            .single();
          if (createErr) { console.error(createErr); if (!cancelled) setLoading(false); return; }
          convId = created.id;
        }
      }
      if (cancelled || !convId) return;
      setConversationId(convId);

      const { data: history, error: histErr } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (histErr) console.error(histErr);
      if (!cancelled) { setMessages(history || []); setLoading(false); }

      supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .neq("sender_id", authUid)
        .is("read_at", null)
        .then(() => {});

      channel = supabase
        .channel(`conversation:${convId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
          (payload) => {
            setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          }
        )
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [listing?.id, authUid, presetConversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !conversationId) return;
    setText("");
    setSendError("");
    const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: authUid, body });
    if (error) { console.error(error); setSendError("Couldn't send — check your connection and try again."); setText(body); }
  };

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack} aria-label={t("back")}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{title || listing?.name}</div>
      </div>
      {listing && !listing.ownerUid && (
        <div style={styles.demoBanner}>
          <AlertTriangle size={14} color="#a17d1f" style={{ flexShrink: 0 }} />
          <span>This business hasn't joined Khidmat yet — your message is saved and will be waiting once they claim their listing.</span>
        </div>
      )}
      <div style={styles.chatArea}>
        {loading && <div style={styles.chatEmpty}>Loading conversation…</div>}
        {!loading && messages.length === 0 && <div style={styles.chatEmpty}>Send a message to start the conversation.</div>}
        {messages.map((m) => (
          <div key={m.id} style={m.sender_id === authUid ? styles.bubbleMe : styles.bubbleThem}>
            {m.body}
            {m.sender_id === authUid && <span style={styles.bubbleTick}>✓</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {sendError && <div style={{ ...styles.errorText, margin: "0 14px 6px" }}>{sendError}</div>}
      <div style={styles.chatInputRow}>
        <input style={styles.chatInput} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeMessage")} onKeyDown={(e) => e.key === "Enter" && send()} enterKeyHint="send" aria-label="Message" disabled={!authUid} />
        <button style={styles.sendBtn} onClick={send} aria-label="Send message" disabled={!authUid}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

function Chat({ listing, messages, onBack, onSend, t }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText(""); };
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack} aria-label={t("back")}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{listing.name}</div>
      </div>
      <div style={styles.demoBanner}>
        <AlertTriangle size={14} color="#a17d1f" style={{ flexShrink: 0 }} />
        <span>{t("demoChatBanner")}</span>
      </div>
      <div style={styles.chatArea}>
        {messages.length === 0 && <div style={styles.chatEmpty}>Send a message to start the conversation.</div>}
        {messages.map((m, i) => (<div key={i} style={m.from === "me" ? styles.bubbleMe : styles.bubbleThem}>{m.text}</div>))}
        <div ref={endRef} />
      </div>
      <div style={styles.chatInputRow}>
        <input style={styles.chatInput} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeMessage")} onKeyDown={(e) => e.key === "Enter" && send()} enterKeyHint="send" aria-label="Message" />
        <button style={styles.sendBtn} onClick={send} aria-label="Send message"><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

function ChatList({ listings, conversations, authUid, onOpen, onOpenReal, t }) {
  const demoThreads = Object.keys(conversations).filter((id) => conversations[id]?.length).map((id) => ({ listing: listings.find((l) => l.id === id), messages: conversations[id] })).filter((th) => th.listing);

  const [realThreads, setRealThreads] = useState([]);
  const [loadingReal, setLoadingReal] = useState(true);

  useEffect(() => {
    if (!authUid) return;
    let cancelled = false;
    (async () => {
      const [asCustomer, asProvider] = await Promise.all([
        supabase.from("conversations").select("id, provider_id, providers(name)").eq("customer_id", authUid),
        supabase.from("conversations").select("id, provider_id, providers!inner(name, claimed_by), profiles!conversations_customer_id_fkey(full_name)").eq("providers.claimed_by", authUid),
      ]);
      const mine = (asCustomer.data || []).map((c) => ({ id: c.id, providerId: c.provider_id, title: c.providers?.name || "Provider" }));
      const theirs = (asProvider.data || []).map((c) => ({ id: c.id, providerId: c.provider_id, title: c.profiles?.full_name || "Customer" }));
      if (!cancelled) { setRealThreads([...mine, ...theirs]); setLoadingReal(false); }
    })();
    return () => { cancelled = true; };
  }, [authUid]);

  const empty = !loadingReal && realThreads.length === 0 && demoThreads.length === 0;

  return (
    <div style={styles.screen}>
      <div style={styles.header}><div style={styles.pageTitle}>{t("navChats")}</div></div>
      <div style={styles.list}>
        {empty && <div style={styles.empty}>{t("noConversations")}</div>}
        {realThreads.map((th) => (
          <button key={th.id} className="khidmat-card" style={styles.listingCard} onClick={() => onOpenReal(th)}>
            <div style={styles.listingTop}><div style={styles.listingName}>{th.title}</div></div>
          </button>
        ))}
        {demoThreads.map((th) => {
          const last = th.messages[th.messages.length - 1];
          return (
            <button key={th.listing.id} className="khidmat-card" style={styles.listingCard} onClick={() => onOpen(th.listing)}>
              <div style={styles.listingTop}><div style={styles.listingName}>{th.listing.name}</div></div>
              <div style={styles.listingArea}>{last.from === "me" ? "You: " : ""}{last.text}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Account({ profile, reports, listings, pendingItems, onReview, lang, setLang, t, onAddBusiness, onLogout }) {
  const myClaims = listings.filter((l) => l.claimedBy === profile.full_name);
  return (
    <div style={styles.screen}>
      <div style={styles.header}><div style={styles.pageTitle}>{t("account")}</div></div>
      <div style={{ padding: "0 18px" }}>
        <div style={styles.accountCard}>
          <div style={styles.detailName}>{profile.full_name}</div>
          <div style={styles.listingArea}>{profile.phone} · {profile.role === "provider" ? t("provider") : t("customer")}</div>
          <button style={styles.logoutBtn} onClick={onLogout}>Log out</button>
        </div>

        <div style={styles.sectionLabel}>{t("appLanguage")}</div>
        <div style={{ marginBottom: 4 }}><LangSwitch lang={lang} setLang={setLang} /></div>

        {profile.role === "provider" && (
          <>
            <div style={styles.sectionLabel}>{t("yourClaimed")}</div>
            {myClaims.length === 0 && <div style={styles.empty}>Claim a listing from its detail page to manage it here.</div>}
            {myClaims.map((l) => (
              <div key={l.id} style={styles.listingCard}>
                <div style={styles.listingTop}>
                  <div style={styles.listingName}>{l.name}</div>
                  {l.verified ? <ShieldCheck size={16} color="#1f6f5c" /> : l.claimStatus === "pending" ? <span style={styles.pendingPill}>{t("pendingReview")}</span> : null}
                </div>
                <div style={styles.listingArea}>{l.area}</div>
              </div>
            ))}
            <button style={styles.addBusinessBtn} onClick={onAddBusiness}><Plus size={15} /> {t("addYourBusiness")}</button>
          </>
        )}

        <div style={styles.sectionLabel}>{t("pendingApprovals")}</div>
        {pendingItems.length === 0 && <div style={styles.empty}>{t("noPending")}</div>}
        {pendingItems.map((l) => (
          <div key={l.id} style={styles.listingCard}>
            <div style={styles.listingTop}><div style={styles.listingName}>{l.name}</div><span style={styles.pendingPill}>{t("pendingReview")}</span></div>
            <div style={styles.listingArea}>{l.area}, {l.city} · claimed by {l.claimedBy}</div>
            {l.claimProof && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {l.claimProof.businessPhoto && <img src={l.claimProof.businessPhoto} alt="business proof" style={styles.proofThumb} />}
                {l.claimProof.idPhoto && <img src={l.claimProof.idPhoto} alt="id proof" style={styles.proofThumb} />}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={styles.approveBtn} onClick={() => onReview(l, "approve")}><CircleCheck size={14} /> {t("approve")}</button>
              <button style={styles.rejectBtn} onClick={() => onReview(l, "reject")}><CircleX size={14} /> {t("reject")}</button>
            </div>
          </div>
        ))}

        <div style={styles.sectionLabel}>{t("reportQueue")}</div>
        {reports.length === 0 && <div style={styles.empty}>No reports filed yet.</div>}
        {reports.map((r) => (
          <div key={r.id} style={styles.listingCard}>
            <div style={styles.listingTop}><div style={styles.listingName}>{r.listingName}</div><span style={styles.pricePill}>{r.status}</span></div>
            <div style={styles.listingArea}>{r.reason}</div>
            {r.notes && <div style={{ ...styles.listingArea, marginTop: 4 }}>{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  phone: {
    maxWidth: 420, width: "100%", margin: "0 auto", height: "100dvh", minHeight: "100dvh",
    background: "#faf9f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1c1c1c", borderRadius: 14, overflow: "hidden", border: "1px solid #e6e3da",
    display: "flex", flexDirection: "column",
  },
  splash: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" },
  screen: { display: "flex", flexDirection: "column", flex: 1, position: "relative" },
  brand: { fontSize: 26, fontWeight: 700, color: "#1f6f5c" },
  brandSub: { fontSize: 13.5, color: "#8a8a8a", marginTop: 6 },
  textInput: { width: "100%", border: "1px solid #e6e3da", borderRadius: 10, padding: "13px 12px", fontSize: 16, marginBottom: 16, outline: "none" },
  selectInput: { width: "100%", border: "1px solid #e6e3da", borderRadius: 10, padding: "13px 12px", fontSize: 16, marginBottom: 16, outline: "none", background: "#fff" },
  roleBtn: { flex: 1, minHeight: 44, padding: "11px 0", borderRadius: 10, border: "1px solid #e6e3da", background: "#fff", fontSize: 13.5, color: "#555" },
  roleBtnActive: { flex: 1, minHeight: 44, padding: "11px 0", borderRadius: 10, border: "1px solid #1f6f5c", background: "#1f6f5c", fontSize: 13.5, color: "#fff" },
  langBtn: { padding: "7px 12px", minHeight: 32, borderRadius: 8, border: "1px solid #e6e3da", background: "#fff", fontSize: 12, color: "#555" },
  langBtnActive: { padding: "7px 12px", minHeight: 32, borderRadius: 8, border: "1px solid #1f6f5c", background: "#1f6f5c", fontSize: 12, color: "#fff" },
  footnoteCenter: { fontSize: 11, color: "#9a9a9a", textAlign: "center", marginTop: 10, lineHeight: 1.5 },
  header: { padding: "18px 18px 6px" },
  pageTitle: { fontSize: 20, fontWeight: 700 },
  eyebrow: { fontSize: 13, color: "#8a8a8a", marginBottom: 4 },
  cityBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "6px 0", minHeight: 44 },
  cityText: { fontSize: 20, fontWeight: 600 },
  dropdownScrim: { position: "fixed", inset: 0, zIndex: 9 },
  cityDropdown: { position: "absolute", top: 34, left: 0, background: "#fff", border: "1px solid #e6e3da", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.12)", zIndex: 10, minWidth: 220, overflow: "hidden" },
  citySearchInput: { width: "100%", border: "none", borderBottom: "1px solid #eeece4", padding: "12px", fontSize: 16, outline: "none" },
  cityOptionList: { maxHeight: 240, overflowY: "auto" },
  cityOption: { padding: "12px 14px", fontSize: 14, borderBottom: "1px solid #f0efe9", minHeight: 44, display: "flex", alignItems: "center" },
  searchBar: { margin: "10px 18px", display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e6e3da", borderRadius: 10, padding: "12px" },
  searchInput: { border: "none", outline: "none", fontSize: 16, flex: 1, background: "transparent", minWidth: 0 },
  sectionLabel: { fontSize: 12, color: "#8a8a8a", margin: "14px 18px 8px", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 10, padding: "0 18px" },
  catCard: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#fff", border: "1px solid #e6e3da", borderRadius: 12, padding: "14px 6px", minHeight: 76 },
  catIconBadge: { width: 34, height: 34, borderRadius: "50%", background: "#eef6f3", display: "flex", alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 11.5, textAlign: "center", color: "#333", lineHeight: 1.3 },
  footnote: { fontSize: 11.5, color: "#9a9a9a", padding: "20px 18px", lineHeight: 1.5, marginTop: "auto" },
  topBar: { display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid #eeece4" },
  iconBtn: { background: "none", border: "none", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, marginLeft: -10 },
  topBarTitle: { fontSize: 15.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  liveBadgeRow: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px 0" },
  liveDotOn: { width: 6, height: 6, borderRadius: "50%", background: "#2f9e6f", flexShrink: 0 },
  liveDotOff: { width: 6, height: 6, borderRadius: "50%", background: "#c9a227", flexShrink: 0 },
  liveBadgeText: { fontSize: 11, color: "#9a9a9a" },
  chipsRow: { display: "flex", gap: 8, padding: "12px 18px", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  chip: { flexShrink: 0, padding: "9px 12px", minHeight: 36, borderRadius: 20, border: "1px solid #e6e3da", background: "#fff", fontSize: 12.5, color: "#555" },
  chipActive: { flexShrink: 0, padding: "9px 12px", minHeight: 36, borderRadius: 20, border: "1px solid #1f6f5c", background: "#1f6f5c", fontSize: 12.5, color: "#fff" },
  list: { padding: "4px 18px 18px", display: "flex", flexDirection: "column", gap: 10 },
  empty: { fontSize: 13, color: "#9a9a9a", padding: "24px 4px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  addBusinessLink: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px dashed #1f6f5c", color: "#1f6f5c", fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 10 },
  addBusinessBtn: { marginTop: 4, width: "100%", minHeight: 44, background: "#fff", border: "1px dashed #1f6f5c", color: "#1f6f5c", borderRadius: 10, padding: "11px 0", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  listingCard: { textAlign: "left", background: "#fff", border: "1px solid #e6e3da", borderRadius: 12, padding: 14, width: "100%" },
  listingTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  listingName: { fontSize: 14.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" },
  listingArea: { fontSize: 12, color: "#8a8a8a", display: "flex", alignItems: "center", gap: 4, marginTop: 3 },
  listingMeta: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" },
  ratingPill: { fontSize: 12, background: "#fbf3e3", color: "#8a6413", padding: "3px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 },
  pricePill: { fontSize: 11, background: "#eef6f3", color: "#1f6f5c", padding: "3px 8px", borderRadius: 8 },
  pendingPill: { fontSize: 10.5, background: "#fbf3e3", color: "#8a6413", padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap" },
  pendingBadge: { fontSize: 11.5, background: "#fbf3e3", color: "#8a6413", padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" },
  detailBody: { padding: "16px 18px", flex: 1 },
  detailHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  detailName: { fontSize: 18, fontWeight: 700 },
  verifiedBadge: { fontSize: 11.5, background: "#eef6f3", color: "#1f6f5c", padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" },
  statsRow: { display: "flex", gap: 8, marginTop: 16 },
  statBox: { flex: 1, background: "#f8faf9", border: "1px solid #e6e3da", borderRadius: 10, padding: "10px 8px", textAlign: "center" },
  statValue: { fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  statLabel: { fontSize: 10.5, color: "#9a9a9a", marginTop: 3 },
  reviewCard: { fontSize: 13, color: "#444", background: "#fff", border: "1px solid #e6e3da", borderRadius: 10, padding: 12, lineHeight: 1.5, fontStyle: "italic" },
  actionsRow: { display: "flex", gap: 10, marginTop: 20 },
  actionBtnPrimary: { flex: 1, minHeight: 46, background: "#1f6f5c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  actionBtnSecondary: { flex: 1, minHeight: 46, background: "#fff", color: "#1c1c1c", border: "1px solid #e6e3da", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" },
  claimBtn: { marginTop: 14, width: "100%", minHeight: 44, background: "#fff", border: "1px dashed #1f6f5c", color: "#1f6f5c", borderRadius: 10, padding: "11px 0", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  claimedNote: { marginTop: 12, fontSize: 12, color: "#9a9a9a", textAlign: "center" },
  reportLink: { marginTop: 18, background: "none", border: "none", color: "#a14545", fontSize: 12.5, display: "flex", alignItems: "center", gap: 5, padding: "10px 0" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 20 },
  modalCard: { width: "100%", maxWidth: 420, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "10px 18px calc(18px + var(--safe-bottom))", maxHeight: "88%", overflowY: "auto" },
  modalHandle: { width: 36, height: 4, borderRadius: 4, background: "#e6e3da", margin: "0 auto 12px" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 15.5, fontWeight: 600 },
  radioRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, padding: "10px 0", color: "#333", minHeight: 44 },
  textarea: { width: "100%", border: "1px solid #e6e3da", borderRadius: 10, padding: 10, fontSize: 16, resize: "none", marginBottom: 14 },
  claimStepNote: { display: "flex", gap: 8, background: "#fbf6ec", border: "1px solid #f0e4c4", borderRadius: 10, padding: 10, fontSize: 11.5, color: "#7a6220", lineHeight: 1.5, margin: "4px 0 16px" },
  otpDisplay: { textAlign: "center", fontSize: 28, letterSpacing: 6, fontWeight: 700, color: "#1f6f5c", background: "#eef6f3", borderRadius: 10, padding: "14px 0", marginBottom: 14 },
  errorText: { color: "#a14545", fontSize: 12, marginTop: -10, marginBottom: 14 },
  photoPicker: { border: "1px dashed #d8d4c8", borderRadius: 10, overflow: "hidden", marginBottom: 4 },
  photoPickerEmpty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "22px 10px" },
  photoPreview: { width: "100%", height: 140, objectFit: "cover", display: "block" },
  proofThumb: { width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid #e6e3da" },
  approveBtn: { flex: 1, minHeight: 38, background: "#eef6f3", color: "#1f6f5c", border: "1px solid #cfe6dd", borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
  rejectBtn: { flex: 1, minHeight: 38, background: "#fbeeee", color: "#a14545", border: "1px solid #f0d4d4", borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
  demoBanner: { display: "flex", alignItems: "center", gap: 8, background: "#fbf6ec", borderBottom: "1px solid #f0e4c4", padding: "9px 14px", fontSize: 11.5, color: "#7a6220", lineHeight: 1.4 },
  chatArea: { flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", WebkitOverflowScrolling: "touch" },
  chatEmpty: { fontSize: 12.5, color: "#9a9a9a", textAlign: "center", padding: "30px 10px", lineHeight: 1.5 },
  bubbleMe: { alignSelf: "flex-end", background: "#1f6f5c", color: "#fff", padding: "9px 13px", borderRadius: "12px 12px 2px 12px", fontSize: 13.5, maxWidth: "78%", wordBreak: "break-word" },
  bubbleThem: { alignSelf: "flex-start", background: "#fff", border: "1px solid #e6e3da", padding: "9px 13px", borderRadius: "12px 12px 12px 2px", fontSize: 13.5, maxWidth: "78%", wordBreak: "break-word" },
  bubbleTick: { marginLeft: 6, fontSize: 11, opacity: 0.7 },
  chatInputRow: { display: "flex", gap: 8, padding: "14px", paddingBottom: "calc(14px + var(--safe-bottom))", borderTop: "1px solid #eeece4" },
  chatInput: { flex: 1, border: "1px solid #e6e3da", borderRadius: 20, padding: "12px 14px", fontSize: 16, outline: "none", minWidth: 0 },
  sendBtn: { background: "#1f6f5c", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  accountCard: { background: "#fff", border: "1px solid #e6e3da", borderRadius: 12, padding: 14, marginBottom: 6 },
  logoutBtn: { marginTop: 10, width: "100%", minHeight: 40, background: "#fbeeee", color: "#a14545", border: "1px solid #f0d4d4", borderRadius: 8, fontSize: 12.5, fontWeight: 600 },
  bottomNav: { display: "flex", borderTop: "1px solid #eeece4", background: "#fff", paddingBottom: "var(--safe-bottom)" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: "10px 0 12px", minHeight: 52 },
  navLabel: { fontSize: 10.5, fontWeight: 600 },
  navBadge: { position: "absolute", top: -4, right: -8, minWidth: 15, height: 15, borderRadius: 8, background: "#a14545", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 },
  toast: { position: "absolute", bottom: "calc(70px + var(--safe-bottom))", left: "50%", transform: "translateX(-50%)", background: "#1c1c1c", color: "#fff", fontSize: 12.5, padding: "9px 16px", borderRadius: 20, zIndex: 30, maxWidth: "85%", textAlign: "center" },
};
