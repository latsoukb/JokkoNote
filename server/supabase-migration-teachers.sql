-- À exécuter une fois dans Supabase → SQL Editor
-- (si la table jokko_classes existe déjà, seule cette partie suffit)

create table if not exists public.jokko_teachers (
  id text primary key,
  login text not null unique,
  display_name text not null,
  password_hash text not null,
  salt text not null,
  created_at timestamptz not null default now()
);

alter table public.jokko_teachers enable row level security;
