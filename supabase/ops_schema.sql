-- ============================================================================
-- ConnectWorks Operations Hub — schema, security (RLS) & seed
-- Run ONCE in Supabase → SQL Editor. Private (authenticated-only) tables.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================================

create or replace function public.cw_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---- leads: extend the existing table for field operations ----
alter table public.leads add column if not exists address    text;
alter table public.leads add column if not exists city       text;
alter table public.leads add column if not exists state      text default 'CA';
alter table public.leads add column if not exists zip_code   text;
alter table public.leads add column if not exists notes      text;
alter table public.leads add column if not exists updated_at timestamptz default now();
alter table public.leads add column if not exists status     text default 'New';

-- ============================ PHASE 1 TABLES ============================
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  client_name text, business_name text, phone text, email text,
  address text, city text, state text default 'CA', zip_code text,
  latitude double precision, longitude double precision,
  visit_type text default 'Site Assessment',
  service_needed text, assigned_to text,
  scheduled_date date, start_time text, estimated_duration int default 60,
  fixed_time boolean default false, priority text default 'Medium',
  status text default 'Scheduled', notes text, internal_notes text,
  google_maps_link text, route_order int,
  travel_time_from_previous int, distance_from_previous numeric, route_notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.daily_routes (
  id uuid primary key default gen_random_uuid(),
  route_date date unique not null,
  start_address text, end_address text,
  total_distance numeric, total_drive_time int, total_on_site_time int, total_day_time int,
  google_maps_url text, optimized boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  daily_route_id uuid references public.daily_routes(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  stop_order int, estimated_arrival_time text, estimated_departure_time text,
  travel_time_from_previous int, distance_from_previous numeric, notes text,
  created_at timestamptz default now()
);

create table if not exists public.ops_settings (
  id int primary key default 1,
  company_name text default 'ConnectWorks Low Voltage Solutions',
  phone text default '619-786-1810', email text default 'info@connectworks-sd.com',
  website text default 'www.connectworks-sd.com', service_area text default 'San Diego County',
  base_address text, base_city text default 'San Diego', base_state text default 'CA', base_zip_code text,
  default_route_start text default 'base', default_route_end text default 'base',
  default_warranty_text text default 'ConnectWorks provides a 1-year warranty on labor/installation and a 1-year warranty on equipment, subject to manufacturer terms and normal usage conditions.',
  default_terms_text text default 'This quote is valid for 15 days. Final pricing may vary if site conditions, cable paths, equipment requirements or project scope change after approval.',
  default_quote_validity_days int default 15, default_deposit_percentage int default 50,
  google_maps_enabled boolean default false,
  updated_at timestamptz default now(),
  constraint ops_settings_singleton check (id = 1)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null, role text, phone text, email text, active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.business_types (
  id uuid primary key default gen_random_uuid(), name text not null, active boolean default true
);
create table if not exists public.ops_services (
  id uuid primary key default gen_random_uuid(), name text not null, active boolean default true
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text, entity_id uuid, action text, description text,
  created_by text, created_at timestamptz default now()
);

-- ============================ PHASE 2 TABLES (created now; UI later) ============================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text, lead_id uuid references public.leads(id) on delete set null,
  client_name text, business_name text, client_email text, client_phone text, project_address text,
  quote_title text, quote_description text, service_category text,
  subtotal numeric default 0, discount numeric default 0, tax numeric default 0, total numeric default 0,
  deposit_required numeric, estimated_start_date date, estimated_duration text,
  warranty_text text, terms_text text, status text default 'Draft', valid_until date,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  item_name text, description text, quantity numeric default 1, unit text default 'Each',
  unit_price numeric default 0, total numeric default 0, sort_order int default 0
);
create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text, service_category text, default_title text, default_description text,
  default_line_items jsonb default '[]'::jsonb, default_warranty_text text, default_terms_text text,
  active boolean default true
);
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  client_name text, business_name text, follow_up_date date,
  follow_up_type text default 'First Follow-up', status text default 'Pending',
  notes text, suggested_message text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  client_name text, business_name text, project_address text, service_category text, project_scope text,
  start_date date, estimated_completion_date date, assigned_team text,
  status text default 'Not Started', materials_status text default 'Not Started', notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  item_name text, quantity numeric default 1, supplier text, status text default 'Needed', notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- ============================ updated_at triggers ============================
do $$ declare t text;
begin
  foreach t in array array['visits','daily_routes','ops_settings','quotes','follow_ups','projects','project_materials','leads']
  loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.cw_touch_updated_at();', t);
  end loop;
end $$;

-- ============================ RLS: authenticated-only (private) ============================
do $$ declare t text;
begin
  foreach t in array array['visits','daily_routes','route_stops','ops_settings','team_members',
    'business_types','ops_services','activity_log','quotes','quote_line_items','quote_templates',
    'follow_ups','projects','project_materials']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "ops all %1$s" on public.%1$s;', t);
    execute format('create policy "ops all %1$s" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
  -- leads: allow authenticated to also insert/delete (read/update already exist from CMS schema)
  execute 'drop policy if exists "ops insert leads" on public.leads';
  execute 'create policy "ops insert leads" on public.leads for insert to authenticated with check (true)';
  execute 'drop policy if exists "ops delete leads" on public.leads';
  execute 'create policy "ops delete leads" on public.leads for delete to authenticated using (true)';
end $$;

-- ============================ SEED ============================
insert into public.ops_settings (id, base_address, base_zip_code) values (1, '', '') on conflict (id) do nothing;
insert into public.team_members (name, role) values ('Omar','Owner / Technician') on conflict do nothing;
insert into public.business_types (name) values
('Restaurant / Coffee Shop'),('Warehouse'),('Retail Store'),('Auto Shop'),('Office'),
('Commercial Buildout'),('Property Manager'),('Other Commercial Property') on conflict do nothing;
insert into public.ops_services (name) values
('Video Surveillance'),('Access Control'),('Structured Cabling'),('Fiber Optics'),
('Network & Wireless'),('Intercom & Communication'),('Commercial Audio & Video'),('Multiple Services / Not Sure Yet') on conflict do nothing;

insert into public.quote_templates (template_name, service_category, default_title, default_description) values
('Security Camera Installation','Video Surveillance','Commercial Security Camera Installation','ConnectWorks will provide and install a commercial video surveillance system designed to improve visibility, reduce blind spots and allow remote access for business monitoring. The final system recommendation is based on the layout, coverage needs and operational requirements of the business.'),
('Access Control Installation','Access Control','Commercial Access Control Installation','Installation of access control for doors, staff areas and restricted spaces, with keypads, card readers, mobile credentials and electric strikes as required.'),
('Structured Cabling','Structured Cabling','Structured Cabling Installation','Clean, certified Cat5e/Cat6/Cat6A structured cabling for offices, restaurants, warehouses and new commercial buildouts.'),
('Network & Wireless Setup','Network & Wireless','Business Network & Wi-Fi Setup','Business-grade Wi-Fi, switches and network configuration for stronger coverage, fewer dead zones and reliable performance.'),
('Intercom Installation','Intercom & Communication','Commercial Intercom Installation','Video/audio intercom and door station installation to improve visitor management and entry communication.'),
('Commercial Audio & Video','Commercial Audio & Video','Commercial Audio & Video Installation','Displays, speakers, conference rooms, digital signage and commercial AV for customer and team spaces.'),
('Restaurant Full Low Voltage Setup','Multiple Services','Restaurant Low Voltage Package','Cameras, structured cabling, business Wi-Fi and audio/video for a customer-facing restaurant or coffee shop.'),
('Warehouse Security Setup','Multiple Services','Warehouse Security & Network Package','Camera coverage, access control and networking designed for larger warehouse spaces and operational visibility.'),
('Commercial Buildout Low Voltage Plan','Multiple Services','Commercial Buildout Low Voltage Plan','Plan and install cameras, cabling, network, access control and AV for a new commercial buildout before opening day.')
on conflict do nothing;
