-- ============================================================================
-- Khidmat App — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push` with this as a
-- migration). Written for Postgres 15+ / Supabase's default extensions.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Reference tables
-- ----------------------------------------------------------------------------
create table cities (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

insert into cities (name, slug) values
  ('Lahore', 'lahore'), ('Karachi', 'karachi'), ('Islamabad', 'islamabad'), ('Rawalpindi', 'rawalpindi'),
  ('Faisalabad', 'faisalabad'), ('Multan', 'multan'), ('Peshawar', 'peshawar'), ('Quetta', 'quetta'),
  ('Sialkot', 'sialkot'), ('Gujranwala', 'gujranwala'), ('Hyderabad', 'hyderabad'), ('Bahawalpur', 'bahawalpur'),
  ('Sargodha', 'sargodha'), ('Sukkur', 'sukkur'), ('Sheikhupura', 'sheikhupura'),
  ('Rahim Yar Khan', 'rahim-yar-khan'), ('Gujrat', 'gujrat'), ('Sahiwal', 'sahiwal'), ('Jhang', 'jhang'),
  ('Dera Ghazi Khan', 'dera-ghazi-khan'), ('Kasur', 'kasur'), ('Okara', 'okara'), ('Mardan', 'mardan'),
  ('Chiniot', 'chiniot'), ('Nawabshah', 'nawabshah'), ('Larkana', 'larkana'),
  ('Muzaffargarh', 'muzaffargarh'), ('Jhelum', 'jhelum'), ('Abbottabad', 'abbottabad'), ('Mingora', 'mingora')
on conflict do nothing;

create table categories (
  id serial primary key,
  name text not null unique,
  slug text not null unique,
  icon text
);

insert into categories (name, slug, icon) values
  -- Home repairs & trades
  ('Plumbing', 'plumber', 'Wrench'),
  ('Electrical', 'electrician', 'Zap'),
  ('AC & HVAC', 'ac_repair', 'Snowflake'),
  ('Carpentry', 'carpenter', 'Hammer'),
  ('Painting', 'painter', 'PaintBucket'),
  ('Tiling & Flooring', 'tiler', 'LayoutGrid'),
  ('Roofing & Waterproofing', 'roofing', 'CloudRain'),
  ('Welding & Fabrication', 'welder', 'Flame'),
  ('Construction & Masonry', 'mason', 'Building2'),
  ('Pest Control', 'pest_control', 'Bug'),
  ('Generator & UPS Repair', 'generator_repair', 'BatteryCharging'),
  ('Solar Installation', 'solar', 'Sun'),
  ('Glass & Aluminum Work', 'glass_aluminum', 'Layers'),
  -- Home cleaning & chores
  ('Home Cleaning', 'home_cleaning', 'Sparkles'),
  ('Deep Cleaning', 'deep_cleaning', 'Sparkles'),
  ('Sofa & Carpet Cleaning', 'carpet_cleaning', 'Sparkles'),
  ('Laundry & Dry Cleaning', 'laundry', 'Shirt'),
  ('Gardening & Lawn Care', 'gardening', 'Leaf'),
  ('Water Tank Cleaning', 'tank_cleaning', 'Droplet'),
  -- Repairs & appliances
  ('Appliance Repair', 'appliance_repair', 'Wrench'),
  ('Mobile & Computer Repair', 'mobile_repair', 'Smartphone'),
  ('TV & Electronics Repair', 'electronics_repair', 'Tv'),
  -- Automotive
  ('Auto Mechanic', 'mechanic', 'Car'),
  ('Car Wash', 'car_wash', 'Droplet'),
  ('Towing Service', 'towing', 'Truck'),
  ('Bike Repair', 'bike_repair', 'Bike'),
  -- Personal care & beauty
  ('Women''s Salon', 'salon_women', 'Scissors'),
  ('Men''s Barber', 'barber', 'Scissors'),
  ('Spa & Massage', 'spa', 'Heart'),
  ('Mehndi Artist', 'mehndi', 'Feather'),
  ('Makeup Artist', 'makeup_artist', 'Brush'),
  ('Personal Trainer', 'personal_trainer', 'Dumbbell'),
  -- Professional services
  ('Home Tutor', 'home_tutor', 'GraduationCap'),
  ('Lawyer', 'lawyer', 'Scale'),
  ('Accountant & Tax', 'accountant', 'Calculator'),
  ('Interior Design', 'interior_designer', 'Palette'),
  ('Architect', 'architect', 'Ruler'),
  ('Photography & Video', 'photographer', 'Camera'),
  ('Event Planning', 'event_planner', 'PartyPopper'),
  ('Catering', 'caterer', 'UtensilsCrossed'),
  -- Moving, logistics & domestic help
  ('Movers & Packers', 'movers', 'Truck'),
  ('Courier & Delivery', 'courier', 'Package'),
  ('Personal Driver', 'driver', 'Car'),
  ('Domestic Help / Maid', 'maid', 'Home'),
  ('Babysitter & Nanny', 'babysitter', 'Baby'),
  ('Home Cook / Chef', 'cook', 'ChefHat'),
  ('Elderly Care', 'elderly_care', 'HeartHandshake'),
  -- Security & pets
  ('Security Guard', 'security_guard', 'Shield'),
  ('CCTV Installation', 'cctv', 'Video'),
  ('Pet Grooming', 'pet_grooming', 'PawPrint'),
  ('Veterinary Services', 'veterinarian', 'Stethoscope')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- User profiles (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'provider', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  city_id int references cities(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Providers (the core listings table — synced from Google Places, then
-- optionally claimed and enriched by the business owner)
-- ----------------------------------------------------------------------------
create table providers (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,               -- null once fully self-managed, but kept for re-sync matching
  name text not null,
  category_id int not null references categories(id),
  city_id int not null references cities(id),
  area text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  google_rating numeric(2,1),
  google_rating_count int,
  price_level smallint,                       -- 0-4 raw signal from Google, nullable
  price_label text,                           -- human label, editable once claimed
  hours jsonb,                                -- weekday -> "9:00 AM - 8:00 PM" etc
  verified boolean not null default false,    -- true once claimed + confirmed
  claimed_by uuid references profiles(id),
  source text not null default 'google_places',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_providers_city_category on providers (city_id, category_id);
create index idx_providers_name_trgm on providers using gin (name gin_trgm_ops);
create extension if not exists pg_trgm;

create table provider_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  source text not null default 'google_places',
  author text,
  rating smallint,
  body text,
  review_time timestamptz,
  created_at timestamptz not null default now()
);

create index idx_reviews_provider on provider_reviews (provider_id);

-- ----------------------------------------------------------------------------
-- Chat: one conversation per (provider, customer) pair
-- ----------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (provider_id, customer_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- Reports
-- ----------------------------------------------------------------------------
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table reports (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  reporter_id uuid references profiles(id),
  reason text not null,
  notes text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index idx_reports_status on reports (status);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table providers enable row level security;
alter table provider_reviews enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;

-- profiles: users can read/update their own profile; admins read all
create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

-- providers: public read for everyone (incl. anon); writes only via service_role (sync job) or the claiming owner
create policy "providers_public_read" on providers for select using (true);
create policy "providers_owner_update" on providers for update
  using (claimed_by = auth.uid());

-- reviews: public read
create policy "reviews_public_read" on provider_reviews for select using (true);

-- conversations: only the two participants can see/create it
create policy "conversations_participant_select" on conversations for select
  using (customer_id = auth.uid() or provider_id in (select id from providers where claimed_by = auth.uid()));
create policy "conversations_customer_insert" on conversations for insert
  with check (customer_id = auth.uid());

-- messages: only participants of the parent conversation
create policy "messages_participant_select" on messages for select
  using (conversation_id in (
    select id from conversations
    where customer_id = auth.uid()
       or provider_id in (select id from providers where claimed_by = auth.uid())
  ));
create policy "messages_participant_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from conversations
      where customer_id = auth.uid()
         or provider_id in (select id from providers where claimed_by = auth.uid())
    )
  );

-- reports: any authenticated user can file one; only admins can read the queue
create policy "reports_insert_authenticated" on reports for insert
  with check (reporter_id = auth.uid());
create policy "reports_admin_select" on reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- Realtime (enables live chat via Supabase Realtime)
-- ============================================================================
alter publication supabase_realtime add table messages;
