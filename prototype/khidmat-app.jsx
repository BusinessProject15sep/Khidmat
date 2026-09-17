         </div>
          {listing.verified && <span style={styles.verifiedBadge}><ShieldCheck size={13} /> Verified</span>}
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statValue}><Star size={14} fill="#c98a1f" color="#c98a1f" /> {listing.rating}</div>
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

        <div style={styles.sectionLabel}>Recent review</div>
        <div style={styles.reviewCard}>"{listing.review}"</div>

        <div style={styles.actionsRow}>
          <a href={`tel:${listing.phone}`} style={styles.actionBtnSecondary}><Phone size={16} /> Call</a>
          <button style={styles.actionBtnPrimary} onClick={onChat}><MessageCircle size={16} /> Chat</button>
        </div>

        {canClaim && (
          <button style={styles.claimBtn} onClick={onClaim}><CheckCircle2 size={15} /> This is my business — claim it</button>
        )}
        {listing.claimedBy && <div style={styles.claimedNote}>Claimed by {listing.claimedBy}</div>}

        <button style={styles.reportLink} onClick={() => setShowReport(true)}><Flag size={14} /> Report this listing</button>
      </div>
      {showReport && <ReportModal listing={listing} onClose={() => setShowReport(false)} onSubmit={(reason, notes) => { onReport(reason, notes); setShowReport(false); }} />}
    </div>
  );
}

function ReportModal({ listing, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [notes, setNotes] = useState("");
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHead}>
          <div style={styles.modalTitle}>Report {listing.name}</div>
          <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
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

function Chat({ listing, messages, onSend, onBack }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText(""); };
  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={onBack}><ChevronLeft size={20} /></button>
        <div style={styles.topBarTitle}>{listing.name}</div>
      </div>
      <div style={styles.chatArea}>
        {messages.length === 0 && <div style={styles.chatEmpty}>Send a message to start the conversation. The provider's replies here are simulated for testing — real two-way chat needs the Supabase realtime wiring from BACKEND-SETUP.md.</div>}
        {messages.map((m, i) => (<div key={i} style={m.from === "me" ? styles.bubbleMe : styles.bubbleThem}>{m.text}</div>))}
        <div ref={endRef} />
      </div>
      <div style={styles.chatInputRow}>
        <input style={styles.chatInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" onKeyDown={(e) => e.key === "Enter" && send()} />
        <button style={styles.sendBtn} onClick={send}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

function ChatList({ listings, conversations, onOpen }) {
  const threads = Object.keys(conversations).filter((id) import React, { useState, useEffect, useRef } from "react";
import {
  Search, MapPin, Star, Phone, MessageCircle, Flag, ChevronLeft, Clock, ShieldCheck, X, Send,
  Wrench, Zap, Snowflake, Sparkles, PaintBucket, Car, User, Home as HomeIcon, MessageSquare, CheckCircle2,
  Hammer, LayoutGrid, CloudRain, Flame, Building2, Bug, BatteryCharging, Sun, Layers, Shirt, Leaf, Droplet,
  Smartphone, Tv, Truck, Bike, Scissors, Heart, Feather, Brush, Dumbbell, GraduationCap, Scale, Calculator,
  Palette, Ruler, Camera, PartyPopper, UtensilsCrossed, Package, Baby, ChefHat, HeartHandshake, Shield,
  Video, PawPrint, Stethoscope,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Search & listings now read from the real Supabase database (public REST
// API, publishable key — safe client-side, matches the RLS policies in
// schema.sql). Chat, claiming, and reports still run on local demo storage
// because those need real user accounts (Supabase Auth) to write safely —
// that's the next piece to build. If a live query fails or comes back empty
// (e.g. the sync script hasn't been run yet), results fall back to the
// seeded demo listings so the app is never blank.
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://cmxobnlzdeziritcveyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNteG9ibmx6ZGV6aXJpdGN2ZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Mzc1NTksImV4cCI6MjEwNTAxMzU1OX0.3SQUvpWz_ALzMN_IRsmu2LaFd-5k1AiXTeYdwJ7j0G8";

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
    review: r.provider_reviews?.[0]?.body || "No reviews yet.",
    _live: true,
  }));
}

const CATEGORY_SECTIONS = [
  {
    title: "Home Repairs & Trades",
    items: [
      { id: "plumber", label: "Plumbing", icon: Wrench },
      { id: "electrician", label: "Electrical", icon: Zap },
      { id: "ac_repair", label: "AC & HVAC", icon: Snowflake },
      { id: "carpenter", label: "Carpentry", icon: Hammer },
      { id: "painter", label: "Painting", icon: PaintBucket },
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
      { id: "home_cleaning", label: "Home Cleaning", icon: Sparkles },
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
      { id: "mechanic", label: "Auto Mechanic", icon: Car },
      { id: "car_wash", label: "Car Wash", icon: Droplet },
      { id: "towing", label: "Towing Service", icon: Truck },
      { id: "bike_repair", label: "Bike Repair", icon: Bike },
    ],
  },
  {
    title: "Personal Care & Beauty",
    items: [
      { id: "salon_women", label: "Women's Salon", icon: Scissors },
      { id: "barber", label: "Men's Barber", icon: Scissors },
      { id: "spa", label: "Spa & Massage", icon: Heart },
      { id: "mehndi", label: "Mehndi Artist", icon: Feather },
      { id: "makeup_artist", label: "Makeup Artist", icon: Brush },
      { id: "personal_trainer", label: "Personal Trainer", icon: Dumbbell },
    ],
  },
  {
    title: "Professional Services",
    items: [
      { id: "home_tutor", label: "Home Tutor", icon: GraduationCap },
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
      { id: "maid", label: "Domestic Help / Maid", icon: HomeIcon },
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

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const [city, setCity] = useState("Lahore");
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [activeListing, setActiveListing] = useState(null);
  const [listings, setListings] = useState(SEED_LISTINGS); // local claim/demo overrides only
  const [liveResults, setLiveResults] = useState(null);
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | loading | live | empty | error
  const [conversations, setConversations] = useState({}); // listingId -> [{from, text, ts}]
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState(null);

  // Pull real listings from Supabase whenever the results screen is showing
  // a given city/category. Falls back silently to demo data on error/empty.
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
    (async () => {
      try {
        const p = await window.storage.get("profile", false);
        if (p && p.value) setProfile(JSON.parse(p.value));
        const l = await window.storage.get("listings", true);
        if (l && l.value) setListings(JSON.parse(l.value));
        else await window.storage.set("listings", JSON.stringify(SEED_LISTINGS), true);
        const c = await window.storage.get("conversations", false);
        if (c && c.value) setConversations(JSON.parse(c.value));
        const r = await window.storage.get("reports", true);
        if (r && r.value) setReports(JSON.parse(r.value));
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const saveProfile = async (p) => {
    setProfile(p);
    try { await window.storage.set("profile", JSON.stringify(p), false); } catch (e) {}
  };

  const saveListings = async (next) => {
    setListings(next);
    try { await window.storage.set("listings", JSON.stringify(next), true); } catch (e) {}
  };

  const saveConversations = async (next) => {
    setConversations(next);
    try { await window.storage.set("conversations", JSON.stringify(next), false); } catch (e) {}
  };

  const sendMessage = (listing, text) => {
    const thread = conversations[listing.id] || [];
    const withMine = [...thread, { from: "me", text, ts: Date.now() }];
    saveConversations({ ...conversations, [listing.id]: withMine });
    // demo-only: simulate the provider replying, so chat is testable end-to-end
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setConversations((prev) => {
        const t = prev[listing.id] || [];
        const next = { ...prev, [listing.id]: [...t, { from: "them", text: reply, ts: Date.now() }] };
        window.storage.set("conversations", JSON.stringify(next), false).catch(() => {});
        return next;
      });
    }, 1100);
  };

  const submitReport = async (listing, reason, notes) => {
    const report = { id: `r_${Date.now()}`, listingId: listing.id, listingName: listing.name, reason, notes, city: listing.city, reporter: profile?.name || "Anonymous", ts: new Date().toISOString(), status: "open" };
    const next = [report, ...reports];
    setReports(next);
    try { await window.storage.set("reports", JSON.stringify(next), true); } catch (e) {}
    showToast("Report submitted — thanks for flagging this");
  };

  const claimListing = async (listing) => {
    const exists = listings.some((l) => l.id === listing.id);
    const claimed = { ...listing, verified: true, claimedBy: profile?.name || "Owner" };
    const next = exists ? listings.map((l) => (l.id === listing.id ? claimed : l)) : [...listings, claimed];
    await saveListings(next);
    setActiveListing(claimed);
    showToast(listing._live ? "Claimed locally — writing this back to Supabase needs the auth piece next" : "Listing claimed — now marked verified");
  };

  const overridesById = Object.fromEntries(listings.map((l) => [l.id, l]));
  const source = liveStatus === "live" && liveResults ? liveResults : SEED_LISTINGS;
  const filtered = source
    .map((l) => (overridesById[l.id] ? { ...l, ...overridesById[l.id] } : l))
    .filter((l) => {
      if (l.city !== city) return false;
      if (category && l.category !== category) return false;
      if (query && !l.name.toLowerCase().includes(query.toLowerCase()) && !l.area.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

  if (!ready) return <div style={styles.phone} />;

  if (!profile) {
    return (
      <div style={styles.phone}>
        <GlobalStyle />
        <Onboarding onDone={saveProfile} />
      </div>
    );
  }

  return (
    <div style={styles.phone}>
      <GlobalStyle />

      <div style={styles.body}>
        {screen === "home" && (
          <Home city={city} setCity={setCity} onPickCategory={(id) => { setCategory(id); setScreen("results"); }} query={query} setQuery={setQuery} onSearch={() => setScreen("results")} profile={profile} />
        )}
        {screen === "results" && (
          <Results city={city} category={category} setCategory={setCategory} listings={filtered} liveStatus={liveStatus} onBack={() => setScreen("home")} onOpen={(l) => { setActiveListing(l); setScreen("detail"); }} />
        )}
        {screen === "detail" && activeListing && (
          <Detail listing={listings.find((l) => l.id === activeListing.id) || activeListing} profile={profile} onBack={() => setScreen("results")} onChat={() => setScreen("chat")} onReport={(reason, notes) => submitReport(activeListing, reason, notes)} onClaim={() => claimListing(activeListing)} />
        )}
        {screen === "chat" && activeListing && (
          <Chat listing={activeListing} messages={conversations[activeListing.id] || []} onSend={(text) => sendMessage(activeListing, text)} onBack={() => setScreen("detail")} />
        )}
        {screen === "chats" && (
          <ChatList listings={listings} conversations={conversations} onOpen={(l) => { setActiveListing(l); setScreen("chat"); }} />
        )}
        {screen === "account" && (
          <Account profile={profile} reports={reports} listings={listings} />
        )}
      </div>

      {screen !== "chat" && (
        <BottomNav screen={screen} setScreen={setScreen} />
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      button { font-family: inherit; cursor: pointer; }
      inpugn: "center", padding: "30px 10px", lineHeight: 1.5 },
  bubbleMe: { alignSelf: "flex-end", background: "#1f6f5c", color: "#fff", padding: "9px 13px", borderRadius: "12px 12px 2px 12px", fontSize: 13.5, maxWidth: "78%" },
  bubbleThem: { alignSelf: "flex-start", background: "#fff", border: "1px solid #e6e3da", padding: "9px 13px", borderRadius: "12px 12px 12px 2px", fontSize: 13.5, maxWidth: "78%" },
  chatInputRow: { display: "flex", gap: 8, padding: 14, borderTop: "1px solid #eeece4" },
  chatInput: { flex: 1, border: "1px solid #e6e3da", borderRadius: 20, padding: "10px 14px", fontSize: 13.5, outline: "none" },
  sendBtn: { background: "#1f6f5c", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" },
  accountCard: { background: "#fff", border: "1px solid #e6e3da", borderRadius: 12, padding: 14, marginBottom: 6 },
  bottomNav: { display: "flex", borderTop: "1px solid #eeece4", background: "#fff" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: "10px 0 12px" },
  navLabel: { fontSize: 10.5, fontWeight: 600 },
  toast: { position: "absolute", bottom: 70, left: "50%", transform: "translateX(-50%)", background: "#1c1c1c", color: "#fff", fontSize: 12.5, padding: "9px 16px", borderRadius: 20, zIndex: 30 },
};
        {screen === "home" && (
          <Home city={city} setCity={setCity} onPickCategory={(id) => { setCategory(id); setScreen("results"); }} query={query} setQuery={setQuery} onSearch={() => setScreen("results")} profile={profile} />
        )}
        {screen === "results" && (
