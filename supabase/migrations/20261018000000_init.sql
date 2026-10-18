-- Snapfit initial schema.
-- Every table is owned by one account (auth.users) and locked down with
-- row level security so a signed-in user can only ever touch their own rows.

-- ───────────────────────── people ─────────────────────────
-- One account tracks several people: the account holder and their kid(s).
create table public.people (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null default auth.uid() references auth.users on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('adult', 'child')),
  birth_year      int  check (birth_year between 1900 and 2100),
  height_cm       numeric(5,1) check (height_cm between 50 and 250),
  goal_kg         numeric(5,1) check (goal_kg between 10 and 300),
  kcal_target     int  check (kcal_target between 800 and 6000),
  protein_target  int  check (protein_target between 0 and 400),
  water_target_ml int  not null default 2500 check (water_target_ml between 500 and 6000),
  created_at      timestamptz not null default now()
);
create index people_owner_idx on public.people (owner);

-- ───────────────────────── entries ─────────────────────────
-- One row per logged thing. The shape of `data` depends on `type` and is
-- validated in the app with Zod (src/lib/entries.ts). See docs/adr/0003.
create table public.entries (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users on delete cascade,
  person_id   uuid not null references public.people on delete cascade,
  type        text not null check (type in ('weight', 'meal', 'workout', 'sleep', 'checkin', 'water')),
  occurred_at timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  source      text not null default 'manual' check (source in ('photo', 'manual', 'shortcut')),
  -- Set by imports so the same workout or night of sleep is never stored twice.
  external_id text,
  created_at  timestamptz not null default now()
);
create index entries_person_time_idx on public.entries (person_id, occurred_at desc);
-- NULLs never collide, so manual and photo entries (no external_id) are unaffected.
alter table public.entries add constraint entries_dedupe unique (owner, source, external_id);

-- ───────────────────────── settings ─────────────────────────
create table public.settings (
  owner             uuid primary key default auth.uid() references auth.users on delete cascade,
  timezone          text not null default 'UTC',
  wake_hour         int  not null default 7  check (wake_hour between 0 and 23),
  sleep_hour        int  not null default 22 check (sleep_hour between 1 and 24),
  water_reminders   boolean not null default false,
  units             text not null default 'kg' check (units in ('kg', 'lb')),
  updated_at        timestamptz not null default now()
);

-- ───────────────────────── push_subscriptions ─────────────────────────
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── ingest_tokens ─────────────────────────
-- The iPhone Shortcut authenticates with a personal token. Only its SHA-256
-- hash is stored; the app shows the token once when it is created.
create table public.ingest_tokens (
  owner      uuid primary key default auth.uid() references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

-- ───────────────────────── ai_usage ─────────────────────────
-- Every Claude call is logged with its token counts and estimated cost,
-- so the settings page can show what the month actually cost.
create table public.ai_usage (
  id            bigint generated always as identity primary key,
  owner         uuid not null references auth.users on delete cascade,
  route         text not null,
  model         text not null,
  input_tokens  int  not null,
  output_tokens int  not null,
  cost_usd      numeric(10,6) not null,
  created_at    timestamptz not null default now()
);
create index ai_usage_owner_time_idx on public.ai_usage (owner, created_at desc);

-- ───────────────────────── row level security ─────────────────────────
alter table public.people             enable row level security;
alter table public.entries            enable row level security;
alter table public.settings           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.ingest_tokens      enable row level security;
alter table public.ai_usage           enable row level security;

create policy "own people"   on public.people             for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own settings" on public.settings           for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own push"     on public.push_subscriptions for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own tokens"   on public.ingest_tokens      for all using (owner = auth.uid()) with check (owner = auth.uid());
-- Usage rows are written by the server only; users can read their own.
create policy "read own usage" on public.ai_usage for select using (owner = auth.uid());

-- An entry must point at one of the owner's own people.
create policy "own entries" on public.entries for all
  using (owner = auth.uid())
  with check (
    owner = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.owner = auth.uid())
  );

-- ───────────────────────── new account setup ─────────────────────────
-- When someone signs up, create their settings and two starter people.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.settings (owner) values (new.id);
  insert into public.people (owner, name, kind, kcal_target, protein_target)
    values (new.id, 'Me', 'adult', 2000, 120);
  insert into public.people (owner, name, kind, water_target_ml)
    values (new.id, 'My kid', 'child', 1500);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── grants ─────────────────────────
-- Explicit grants, so access works the same whether or not the project
-- auto-exposes new tables. Row level security above still limits rows.
grant select, insert, update, delete on public.people, public.entries, public.settings, public.push_subscriptions, public.ingest_tokens to authenticated;
grant select on public.ai_usage to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
