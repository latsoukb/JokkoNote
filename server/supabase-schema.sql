-- JokkoNote / SeNote — stockage persistant gratuit (Supabase)
-- Dashboard Supabase → SQL Editor → coller et exécuter

create table if not exists public.jokko_classes (
  class_id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists jokko_classes_updated_at_idx
  on public.jokko_classes (updated_at desc);

-- Le serveur sync utilise la clé service_role (jamais dans les apps).
alter table public.jokko_classes enable row level security;
