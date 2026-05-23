-- =============================================================================
-- Water Potty — Initial Schema
-- =============================================================================
-- Apply with:  supabase db push  (local)  or  supabase db push --linked  (remote)
-- Regen types: supabase gen types typescript --local > packages/db/src/types.ts
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.washroom_type as enum (
  'starbucks', 'mcdonalds', 'canadian_tire', 'portable', 'public', 'other'
);

create type public.washroom_status as enum (
  'open', 'pinned', 'occupied', 'closed', 'pending_verification'
);

create type public.user_role as enum ('user', 'admin');

create type public.user_tier as enum ('free', 'subscriber');

create type public.cleanliness as enum ('clean', 'dirty');

create type public.verification_status as enum ('pending', 'approved', 'rejected');

create type public.flag_reason as enum (
  'closed_permanently', 'doesnt_exist', 'incorrect_info', 'inappropriate'
);

create type public.credit_reason as enum (
  'washroom_verified', 'subscription_renewal', 'manual_admin_adjustment'
);


-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- users — mirrors auth.users; populated by handle_new_user trigger
create table public.users (
  id                     uuid        primary key default gen_random_uuid(),
  auth_id                uuid        not null unique references auth.users(id) on delete cascade,
  anonymous_username     text        not null unique,
  email                  text,
  role                   public.user_role not null default 'user',
  tier                   public.user_tier not null default 'free',
  stripe_customer_id     text        unique,
  subscription_expires_at timestamptz,
  created_at             timestamptz not null default now()
);
comment on table public.users is
  'Application user profiles. One row per auth.users entry.';

-- washrooms — the core map data
create table public.washrooms (
  id               uuid                   primary key default gen_random_uuid(),
  name             text                   not null,
  type             public.washroom_type   not null,
  lat              double precision       not null,
  lng              double precision       not null,
  is_pay_to_use    boolean                not null default false,
  status           public.washroom_status not null default 'open',
  last_cleanliness public.cleanliness,
  verified         boolean                not null default false,
  created_by       uuid                   references public.users(id) on delete set null,
  created_at       timestamptz            not null default now(),
  updated_at       timestamptz            not null default now()
);
comment on table public.washrooms is
  'Community-sourced washroom locations.';

-- pins — user reserves a washroom for 30 minutes
create table public.pins (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  washroom_id  uuid        not null references public.washrooms(id) on delete cascade,
  pinned_at    timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '30 minutes'),
  released_at  timestamptz
);
comment on table public.pins is
  '30-minute washroom reservations. released_at set on early release.';

-- feedback — cleanliness reports
create table public.feedback (
  id           uuid              primary key default gen_random_uuid(),
  user_id      uuid              references public.users(id) on delete set null,
  washroom_id  uuid              not null references public.washrooms(id) on delete cascade,
  cleanliness  public.cleanliness not null,
  note         text,
  created_at   timestamptz       not null default now()
);
comment on table public.feedback is
  'User-submitted cleanliness feedback for washrooms.';

-- verifications — admin-reviewed washroom submissions
create table public.verifications (
  id           uuid                       primary key default gen_random_uuid(),
  washroom_id  uuid                       not null references public.washrooms(id) on delete cascade,
  submitter_id uuid                       references public.users(id) on delete set null,
  verifier_id  uuid                       references public.users(id) on delete set null,
  status       public.verification_status not null default 'pending',
  notes        text,
  photo_url    text,
  created_at   timestamptz                not null default now(),
  resolved_at  timestamptz
);
comment on table public.verifications is
  'Washroom verification queue. Approved verifications award credits.';

-- credit_ledger — append-only credit history; balance = sum(delta)
create table public.credit_ledger (
  id           uuid                 primary key default gen_random_uuid(),
  user_id      uuid                 not null references public.users(id) on delete cascade,
  delta        integer              not null,
  reason       public.credit_reason not null,
  reference_id uuid,
  created_at   timestamptz          not null default now()
);
comment on table public.credit_ledger is
  'Immutable credit ledger. Current balance = sum(delta) for a given user.';

-- flags — user-reported issues with washrooms
create table public.flags (
  id           uuid                primary key default gen_random_uuid(),
  washroom_id  uuid                not null references public.washrooms(id) on delete cascade,
  user_id      uuid                references public.users(id) on delete set null,
  reason       public.flag_reason  not null,
  note         text,
  resolved     boolean             not null default false,
  resolved_by  uuid                references public.users(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz         not null default now()
);
comment on table public.flags is
  'User-reported problems with washroom listings.';


-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index users_auth_id_idx            on public.users(auth_id);
create index washrooms_status_idx         on public.washrooms(status);
create index washrooms_location_idx       on public.washrooms(lat, lng);
create index pins_user_id_idx             on public.pins(user_id);
create index pins_washroom_id_idx         on public.pins(washroom_id);
create index pins_expires_at_idx          on public.pins(expires_at);
create index feedback_washroom_id_idx     on public.feedback(washroom_id);
create index verifications_washroom_id_idx on public.verifications(washroom_id);
create index verifications_status_idx     on public.verifications(status);
create index credit_ledger_user_id_idx    on public.credit_ledger(user_id);
create index flags_washroom_id_idx        on public.flags(washroom_id);
create index flags_resolved_idx           on public.flags(resolved);


-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger washrooms_updated_at
  before update on public.washrooms
  for each row execute procedure public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Helper functions (security definer → bypass RLS safely)
-- ---------------------------------------------------------------------------

-- Returns the public.users.id for the currently authenticated user.
-- Used in RLS policies for tables that FK to users.id (not auth.uid).
create or replace function public.get_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid();
$$;

-- Returns true when the calling user has role='admin'.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.users
    where auth_id = auth.uid() and role = 'admin'
  );
$$;

-- Returns the current credit balance for a given user_id.
create or replace function public.get_user_credit_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where user_id = p_user_id;
$$;


-- ---------------------------------------------------------------------------
-- Auto-create users row on new auth signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_id, anonymous_username, email)
  values (
    new.id,
    'anon_' || substr(replace(new.id::text, '-', ''), 1, 10),
    new.email
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.washrooms      enable row level security;
alter table public.pins           enable row level security;
alter table public.feedback       enable row level security;
alter table public.verifications  enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.flags          enable row level security;

-- ── users ──────────────────────────────────────────────────────────────────
-- Own row or admin can read
create policy "users: select own or admin" on public.users
  for select using (auth_id = auth.uid() or public.is_admin());

-- Own row or admin can update (column-level restrictions enforced in app)
create policy "users: update own or admin" on public.users
  for update using (auth_id = auth.uid() or public.is_admin());

-- handle_new_user trigger inserts via security-definer (bypasses RLS).
-- This policy covers any app-layer insert (e.g. onboarding upsert):
create policy "users: insert own" on public.users
  for insert with check (auth_id = auth.uid());

-- ── washrooms ──────────────────────────────────────────────────────────────
-- Public read — anyone (even unauthenticated) can see washrooms
create policy "washrooms: public select" on public.washrooms
  for select using (true);

-- Any authenticated user can add a washroom
create policy "washrooms: auth insert" on public.washrooms
  for insert with check (auth.uid() is not null);

-- Creator or admin can update
create policy "washrooms: creator or admin update" on public.washrooms
  for update using (created_by = public.get_user_id() or public.is_admin());

-- Admin only delete
create policy "washrooms: admin delete" on public.washrooms
  for delete using (public.is_admin());

-- ── pins ───────────────────────────────────────────────────────────────────
create policy "pins: own select" on public.pins
  for select using (user_id = public.get_user_id() or public.is_admin());

create policy "pins: own insert" on public.pins
  for insert with check (user_id = public.get_user_id());

create policy "pins: own update" on public.pins
  for update using (user_id = public.get_user_id() or public.is_admin());

create policy "pins: admin delete" on public.pins
  for delete using (public.is_admin());

-- ── feedback ───────────────────────────────────────────────────────────────
-- Feedback is public so users can see cleanliness history
create policy "feedback: public select" on public.feedback
  for select using (true);

create policy "feedback: auth insert" on public.feedback
  for insert with check (auth.uid() is not null);

-- Only admin can update/delete feedback
create policy "feedback: admin modify" on public.feedback
  for all using (public.is_admin());

-- ── verifications ──────────────────────────────────────────────────────────
-- Submitter can see their own; admin sees all
create policy "verifications: submitter or admin select" on public.verifications
  for select using (submitter_id = public.get_user_id() or public.is_admin());

create policy "verifications: auth insert" on public.verifications
  for insert with check (auth.uid() is not null);

-- Only admin resolves verifications
create policy "verifications: admin update" on public.verifications
  for update using (public.is_admin());

create policy "verifications: admin delete" on public.verifications
  for delete using (public.is_admin());

-- ── credit_ledger ──────────────────────────────────────────────────────────
-- Users see only their own credits; admin sees all
create policy "credit_ledger: own or admin select" on public.credit_ledger
  for select using (user_id = public.get_user_id() or public.is_admin());

-- Only admin (or server-side service role) can write ledger entries
create policy "credit_ledger: admin insert" on public.credit_ledger
  for insert with check (public.is_admin());

create policy "credit_ledger: admin modify" on public.credit_ledger
  for all using (public.is_admin());

-- ── flags ──────────────────────────────────────────────────────────────────
-- Reporter or admin can read
create policy "flags: own or admin select" on public.flags
  for select using (user_id = public.get_user_id() or public.is_admin());

-- Any authenticated user can report a flag
create policy "flags: auth insert" on public.flags
  for insert with check (auth.uid() is not null);

-- Admin resolves flags
create policy "flags: admin update" on public.flags
  for update using (public.is_admin());

create policy "flags: admin delete" on public.flags
  for delete using (public.is_admin());


-- ---------------------------------------------------------------------------
-- Grant usage to Supabase roles
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.washrooms to anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on function public.get_user_credit_balance(uuid) to authenticated;
