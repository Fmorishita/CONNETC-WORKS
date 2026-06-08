-- ============================================================================
-- ConnectWorks CMS — Supabase schema, security (RLS), storage & seed data
-- Run ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent): uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ============================================================================

-- ---------- helper: keep updated_at fresh ----------
create or replace function public.cw_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Single-row global settings ------------------------------------------------
create table if not exists public.site_settings (
  id            int primary key default 1,
  company_name  text default 'ConnectWorks Low Voltage Solutions',
  tagline       text default 'Low Voltage Solutions',
  phone         text default '619-786-1810',
  email         text default 'info@connectworks-sd.com',
  website       text default 'https://www.connectworks-sd.com',
  service_area  text default 'San Diego County',
  address       text,
  logo_url      text,
  favicon_url   text,
  og_image_url  text,
  facebook_url  text,
  instagram_url text,
  linkedin_url  text,
  yelp_url      text,
  google_reviews_url text,
  has_licenses  boolean default false,
  license_text  text default 'Licensed & Insured',
  no_license_text text default 'Professional Low Voltage Installations',
  review_rating text default '',
  review_rating_label text default 'average from local business owners',
  updated_at    timestamptz default now(),
  constraint site_settings_singleton check (id = 1)
);

-- Generic keyed sections (hero, cta_banner, intros, etc.) -------------------
create table if not exists public.home_sections (
  id            uuid primary key default gen_random_uuid(),
  section_key   text unique not null,
  eyebrow       text,
  title         text,
  subtitle      text,
  content       text,
  image_url     text,
  cta_text      text,
  cta_link      text,
  cta2_text     text,
  cta2_link     text,
  settings_json jsonb default '{}'::jsonb,
  active        boolean default true,
  sort_order    int default 0,
  updated_at    timestamptz default now()
);

create table if not exists public.trust_badges (
  id uuid primary key default gen_random_uuid(),
  label text not null, icon text default 'check',
  sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text,
  short_description text, long_description text,
  icon text default 'camera', image_url text,
  cta_text text default 'Free Quote', cta_link text default '#contact',
  sort_order int default 0, active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  icon text default 'office', image_url text,
  sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, icon text default 'shield',
  sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.process_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, icon text default 'chat',
  step_number int default 1, sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, icon text default 'alert',
  sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null, category text, description text,
  image_url text, gallery_json jsonb default '[]'::jsonb,
  location text, service_related text, industry_related text,
  is_real_project boolean default false, featured boolean default false,
  sort_order int default 0, active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  client_name text not null, company text, review_text text,
  rating int default 5, source text default 'Direct', source_url text,
  review_date date, sort_order int default 0, active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.seo_settings (
  id uuid primary key default gen_random_uuid(),
  page_key text unique not null default 'home',
  meta_title text, meta_description text,
  og_title text, og_description text, og_image text,
  canonical_url text, keywords_json jsonb default '[]'::jsonb,
  schema_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.form_settings (
  id int primary key default 1,
  business_types text, services text, project_types text, timelines text, budgets text,
  submit_text text default 'Request My Free Quote',
  success_message text default 'Thanks! Your request was received — we''ll get back to you shortly. For immediate help, call 619-786-1810.',
  thankyou_message text default 'We''ll review your project and reach out shortly with honest next steps. Need to talk now?',
  updated_at timestamptz default now(),
  constraint form_settings_singleton check (id = 1)
);

-- Leads already exist from the lead form; ensure status + admin columns -----
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text, business text, phone text, email text,
  business_type text, service text, project_type text,
  timeline text, budget text, message text,
  source text default 'website', user_agent text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text
);
alter table public.leads add column if not exists status text default 'new';

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$ declare t text;
begin
  foreach t in array array['site_settings','home_sections','trust_badges','services',
    'industries','features','process_steps','problems','projects','reviews','seo_settings','form_settings']
  loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s
                    for each row execute function public.cw_touch_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY
--   Public (anon) can READ content. Only authenticated admins can WRITE.
--   Leads: NOT publicly readable; only authenticated can read/update.
-- ============================================================================
do $$ declare t text;
begin
  -- content tables: public read + authenticated write
  foreach t in array array['site_settings','home_sections','trust_badges','services',
    'industries','features','process_steps','problems','projects','reviews','seo_settings','form_settings']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public read %1$s" on public.%1$s;', t);
    execute format('create policy "public read %1$s" on public.%1$s for select using (true);', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$s;', t);
    execute format('create policy "admin write %1$s" on public.%1$s for all
                    to authenticated using (true) with check (true);', t);
  end loop;

  -- leads: private. Anon CANNOT read. Authenticated admins can read + update status.
  execute 'alter table public.leads enable row level security';
  execute 'drop policy if exists "admin read leads" on public.leads';
  execute 'create policy "admin read leads" on public.leads for select to authenticated using (true)';
  execute 'drop policy if exists "admin update leads" on public.leads';
  execute 'create policy "admin update leads" on public.leads for update to authenticated using (true) with check (true)';
  -- Inserts to leads come from the serverless function (service role, bypasses RLS).
end $$;

-- ============================================================================
-- STORAGE: public "media" bucket for images (public read, admin write)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media','media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media');
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');

-- ============================================================================
-- SEED DATA (mirrors the current live site). Run-once via ON CONFLICT.
-- ============================================================================
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

insert into public.home_sections (section_key, eyebrow, title, subtitle, cta_text, cta_link, cta2_text, cta2_link) values
('hero',
 'San Diego County · Commercial Low Voltage Experts',
 'Commercial Low Voltage & Security Solutions for **San Diego Businesses**',
 'From security cameras and access control to structured cabling, business Wi-Fi, intercom and commercial audio/video, ConnectWorks designs and installs reliable systems built around your space, budget and operations.',
 'Request a Free Quote', '#contact', 'Call 619-786-1810', 'tel:+16197861810')
on conflict (section_key) do nothing;

insert into public.home_sections (section_key, title, content, cta_text, cta_link) values
('cta_banner',
 'Ready to Upgrade Your Business Security, Network or Low Voltage System?',
 'Tell us about your commercial space and we''ll help you choose the right solution — built around your space, your workflow and your budget.',
 'Request a Free Quote', '#contact')
on conflict (section_key) do nothing;

insert into public.trust_badges (label, icon, sort_order) values
('10+ Years of Experience','clock',1),
('1-Year Labor & Equipment Warranty','shield',2),
('San Diego County Local Support','pin',3),
('Honest Recommendations','fair',4)
on conflict do nothing;

insert into public.services (title, slug, short_description, icon, image_url, sort_order) values
('Video Surveillance','video-surveillance','HD and 4K camera systems designed to improve visibility, reduce blind spots and help business owners monitor their property remotely.','camera','assets/services/video-surveillance.jpg',1),
('Access Control','access-control','Secure doors, staff areas and restricted spaces with keypads, card readers, mobile credentials and electric strikes.','lock','assets/services/access-control.jpg',2),
('Intercom & Communication','intercom','Video intercoms, audio intercoms and door stations that improve visitor management and entry communication.','intercom','assets/services/intercom.jpg',3),
('Structured Cabling','structured-cabling','Clean Cat5e, Cat6 and Cat6A cabling for offices, restaurants, warehouses and new commercial buildouts.','cable','assets/services/structured-cabling.jpg',4),
('Fiber Optics','fiber-optics','Fiber installation, fusion splicing, testing and high-speed connectivity for growing business environments.','fiber','assets/services/fiber-optics.jpg',5),
('Network & Wireless','network-wireless','Business-grade Wi-Fi, switches and network setup for stronger coverage, fewer dead zones and smoother operations.','wifi','assets/services/network-wireless.jpg',6),
('Commercial Audio & Video','commercial-av','Displays, speakers, conference rooms, digital signage and commercial audio/video systems for customer and team spaces.','av','assets/services/commercial-av.jpg',7)
on conflict do nothing;

insert into public.industries (title, icon, sort_order) values
('Restaurants','restaurant',1),('Coffee Shops','coffee',2),('Warehouses','warehouse',3),
('Auto Shops','car',4),('Retail Stores','retail',5),('Offices','office',6),
('Commercial Buildouts','tools',7),('Multi-Tenant Buildings','multi',8),('Property Managers','manager',9)
on conflict do nothing;

insert into public.features (title, description, icon, sort_order) values
('Honest, No-Oversell Approach','We recommend what fits your space and goals — not the most expensive option.','fair',1),
('10+ Years of Field Experience','Hands-on experience across security, cabling, networks, intercom and commercial AV.','clock',2),
('Commercial-Ready Installations','Clean, organized work designed for businesses, not temporary fixes.','office',3),
('1-Year Warranty','Warranty on labor/installation and equipment for peace of mind.','shield',4),
('Local San Diego Support','A local team that understands San Diego businesses and shows up when needed.','pin',5),
('Custom Solutions','Every proposal is built around your building, workflow and budget.','sliders',6)
on conflict do nothing;

insert into public.process_steps (title, description, icon, step_number, sort_order) values
('Consultation','Tell us what you need, what problem you''re trying to solve and what type of business you operate.','chat',1,1),
('Site Assessment','We review your layout, coverage needs, cabling routes, access points and technical requirements.','clipboard',2,2),
('Honest Recommendation','You get a clear, itemized proposal with the right solution for your space and budget.','fair',3,3),
('Professional Installation','We install cleanly, test the system and make sure everything is working properly.','wrench',4,4),
('Support & Follow-Up','Responsive local support after installation — and we stand behind every install.','headset',5,5)
on conflict do nothing;

insert into public.problems (title, icon, sort_order) values
('Poor camera coverage or outdated DVR/NVR systems','alert',1),
('Messy or unreliable cabling','alert',2),
('Weak Wi-Fi or network dead zones','alert',3),
('No control over who enters staff-only areas','alert',4),
('Old intercom systems or poor visitor communication','alert',5),
('Opening a new space without a clear low voltage plan','alert',6),
('Vendors who oversell equipment instead of solving the real issue','alert',7)
on conflict do nothing;

insert into public.seo_settings (page_key, meta_title, meta_description, canonical_url) values
('home',
 'Commercial Low Voltage & Security Solutions in San Diego | ConnectWorks',
 'ConnectWorks provides commercial low voltage, security camera installation, access control, structured cabling, fiber optics, network, intercom and commercial AV solutions across San Diego County.',
 'https://www.connectworks-sd.com/')
on conflict (page_key) do nothing;

insert into public.projects (title, category, image_url, is_real_project, featured, sort_order) values
('Structured Cabling','Structured Cabling','assets/gallery/project-cabling.jpg',true,true,1),
('Security Cameras','Security Cameras','assets/gallery/project-cameras.jpg',true,false,2),
('Access Control','Access Control','assets/gallery/project-access.jpg',true,false,3),
('Intercom','Intercom','assets/gallery/project-intercom.jpg',true,false,4),
('Network & Wireless','Network & Wireless','assets/gallery/project-network.jpg',true,false,5),
('Service Vehicle / Local Team','Service Vehicle / Local Team','assets/gallery/project-team.jpg',true,true,6)
on conflict do nothing;

insert into public.form_settings (id, business_types, services, project_types, timelines, budgets) values
(1,
 E'Restaurant / Coffee Shop\nWarehouse\nRetail Store\nAuto Shop\nOffice\nCommercial Buildout\nProperty Manager\nOther Commercial Property',
 E'Video Surveillance\nAccess Control\nStructured Cabling\nFiber Optics\nNetwork & Wireless\nIntercom & Communication\nCommercial Audio & Video\nMultiple Services / Not Sure Yet',
 E'New Installation\nUpgrade Existing System\nNew Buildout / Remodel\nRepair / Service',
 E'As soon as possible\nThis month\n1–3 months\nPlanning ahead',
 E'Under $1,000\n$1,000–$3,000\n$3,000–$5,000\n$5,000–$10,000\n$10,000+\nNot sure yet')
on conflict (id) do nothing;

-- NOTE: Reviews are intentionally NOT seeded with fake testimonials.
-- Add real ones from the admin panel (or here) when available.
