-- ============================================================
-- ConnectWorks — Supabase schema for website lead capture
-- For a NEW project: run this once in Supabase → SQL Editor.
-- If your `leads` table already exists, run migration_commercial.sql instead
-- (it only ADDS the new columns).
-- ============================================================

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  business      text,
  phone         text not null,
  email         text not null,
  business_type text,
  service       text,
  project_type  text,
  timeline      text,
  budget        text,
  message       text,
  source        text default 'website',
  user_agent    text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text
);

-- Enable Row Level Security with NO public policies. The website's serverless
-- function uses the SERVICE ROLE key, which bypasses RLS. The public/anon key
-- cannot read or write, so your leads stay private.
alter table public.leads enable row level security;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
