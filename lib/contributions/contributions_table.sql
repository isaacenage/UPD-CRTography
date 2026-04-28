-- Migration: user-contributed building entries.
-- Apply once in Supabase Dashboard → SQL editor.
--
-- Anonymous visitors can insert (so the public app can submit without
-- auth) and select (so the map can render approved entries to everyone).
-- Updates and deletes require the service role.

create extension if not exists pgcrypto;

create table if not exists public.up_user_contributions (
  id uuid primary key default gen_random_uuid(),
  building_name text not null check (length(btrim(building_name)) between 2 and 120),
  longitude double precision not null,
  latitude double precision not null,
  storage_path text,
  gender text not null check (gender in ('All-Gender', 'Male', 'Female')),
  access text not null check (access in ('Public', 'Students and Staff')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.up_user_contributions enable row level security;

drop policy if exists "anon insert" on public.up_user_contributions;
create policy "anon insert"
  on public.up_user_contributions
  for insert
  to anon
  with check (true);

drop policy if exists "anon read" on public.up_user_contributions;
create policy "anon read"
  on public.up_user_contributions
  for select
  to anon
  using (true);
