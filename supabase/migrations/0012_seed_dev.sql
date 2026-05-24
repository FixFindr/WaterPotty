-- ============================================================
-- 0012_seed_dev.sql
-- Water Potty — Development seed data
--
-- DO NOT run in production. Only for local dev and staging.
-- Creates sample washrooms in Metro Vancouver for testing
-- all marker states without real user data.
--
-- Run after all other migrations:
--   supabase db reset              (resets + runs all migrations)
--   psql ... -f 0012_seed_dev.sql  (or apply via Supabase dashboard)
-- ============================================================

-- Guard: refuse to run on production
DO $$
BEGIN
  IF current_database() = 'postgres' AND
     EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
    RAISE EXCEPTION 'Seed data detected existing users. Refusing to run on production.';
  END IF;
END;
$$;

-- ── Sample washrooms covering all status/type combinations ────────────────────

INSERT INTO public.washrooms
  (name, type, lat, lng, is_pay_to_use, status, last_cleanliness, verified)
VALUES
  -- Gastown / Downtown Vancouver
  ('Starbucks Gastown',              'starbucks',     49.2840, -123.1080, true,  'open',                 'clean', true),
  ('McDonald''s Robson',             'mcdonalds',     49.2817, -123.1208, true,  'open',                 'dirty', true),
  ('Victory Square Public WC',       'public',        49.2820, -123.1098, false, 'open',                 null,    true),
  ('Canadian Tire Pacific Centre',   'canadian_tire', 49.2797, -123.1196, true,  'pinned',               'clean', true),
  ('Portable Toilet — Robson St',    'portable',      49.2830, -123.1175, false, 'occupied',             'dirty', true),
  ('Starbucks Burrard Station',      'starbucks',     49.2851, -123.1201, true,  'open',                 'clean', true),

  -- Kitsilano
  ('Kits Beach Public Washroom',     'public',        49.2739, -123.1527, false, 'open',                 'clean', true),
  ('McDonald''s Broadway',           'mcdonalds',     49.2634, -123.1550, true,  'open',                 null,    true),
  ('Starbucks 4th Ave',              'starbucks',     49.2668, -123.1574, true,  'pinned',               'dirty', true),

  -- East Van / Commercial Drive
  ('Trout Lake Park WC',             'public',        49.2521, -123.0746, false, 'open',                 'clean', true),
  ('Commercial Drive Public WC',     'public',        49.2622, -123.0697, false, 'open',                 'dirty', true),
  ('Portable Toilet — Drive Fest',   'portable',      49.2610, -123.0700, false, 'closed',               null,    true),

  -- North Shore (Lonsdale)
  ('Lonsdale Quay Public WC',        'public',        49.3108, -123.0736, false, 'open',                 'clean', true),
  ('Starbucks Lonsdale',             'starbucks',     49.3201, -123.0724, true,  'open',                 null,    true),

  -- Surrey
  ('Surrey Central Station WC',      'public',        49.1892, -122.8450, false, 'open',                 'clean', true),
  ('Canadian Tire Surrey',           'canadian_tire', 49.1910, -122.8461, true,  'open',                 'dirty', true),

  -- Pending verification (will not show on map for non-creators)
  ('Mystery WC — Pending',           'other',         49.2750, -123.1300, false, 'pending_verification', null,    false);

-- ── Verify seed counts ────────────────────────────────────────────────────────

DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.washrooms;
  RAISE NOTICE 'Seed complete: % washrooms inserted.', v_count;
END;
$$;
