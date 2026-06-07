-- ============================================================
-- ConnectWorks — migration for the commercial revamp
-- Run this in Supabase → SQL Editor IF you already created the `leads` table
-- with the first version of the schema. It only ADDS the new columns and is
-- safe to run more than once.
-- ============================================================

alter table public.leads add column if not exists business_type text;
alter table public.leads add column if not exists project_type  text;
alter table public.leads add column if not exists timeline      text;
alter table public.leads add column if not exists budget        text;
alter table public.leads add column if not exists utm_source    text;
alter table public.leads add column if not exists utm_medium    text;
alter table public.leads add column if not exists utm_campaign  text;
alter table public.leads add column if not exists utm_content   text;
alter table public.leads add column if not exists utm_term      text;
