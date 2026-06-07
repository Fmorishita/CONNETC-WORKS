-- ============================================================
-- ConnectWorks — Supabase schema for website lead capture
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  business    text,
  phone       text not null,
  email       text not null,
  service     text,
  message     text,
  source      text default 'website',
  user_agent  text
);

-- Enable Row Level Security and intentionally add NO public policies.
-- The website's serverless function uses the SERVICE ROLE key, which
-- bypasses RLS. The public/anon key cannot read or write this table,
-- so your leads stay private.
alter table public.leads enable row level security;

-- Helpful index for sorting newest-first in the dashboard.
create index if not exists leads_created_at_idx on public.leads (created_at desc);
