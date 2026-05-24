-- ============================================================
-- 0002_create_washrooms.sql
-- Water Potty — washrooms table
--
-- Core entity. Stores location, type, and live status for every
-- washroom in the ecosystem.
--
-- status lifecycle:
--   pending_verification → open (on peer approval)
--   open → pinned (first active pin inserted)
--   pinned → occupied (second active pin inserted)
--   occupied / pinned → open (all pins expire or are released)
--   any → closed (admin or flag resolution)
--
-- last_cleanliness is a denormalised cache of the most recent
-- feedback row. Updated by trigger in 0010_triggers.sql.
-- ============================================================

CREATE TABLE public.washrooms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  type              text NOT NULL
                      CHECK (type IN (
                        'starbucks',
                        'mcdonalds',
                        'canadian_tire',
                        'portable',
                        'public',
                        'other'
                      )),
  lat               double precision NOT NULL
                      CHECK (lat  BETWEEN -90  AND  90),
  lng               double precision NOT NULL
                      CHECK (lng  BETWEEN -180 AND 180),
  is_pay_to_use     boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'pending_verification'
                      CHECK (status IN (
                        'open',
                        'pinned',
                        'occupied',
                        'closed',
                        'pending_verification'
                      )),
  last_cleanliness  text
                      CHECK (last_cleanliness IN ('clean', 'dirty')),
  verified          boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Spatial index (bounding-box queries in useWashrooms hook) ─────────────────

CREATE INDEX idx_washrooms_lat     ON public.washrooms (lat);
CREATE INDEX idx_washrooms_lng     ON public.washrooms (lng);
CREATE INDEX idx_washrooms_status  ON public.washrooms (status);
CREATE INDEX idx_washrooms_creator ON public.washrooms (created_by);

-- Composite index for the standard map query: status + lat + lng
CREATE INDEX idx_washrooms_map_query
  ON public.washrooms (status, lat, lng)
  WHERE status != 'pending_verification';

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER washrooms_set_updated_at
  BEFORE UPDATE ON public.washrooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.washrooms IS 'All washroom locations in the Water Potty ecosystem.';
COMMENT ON COLUMN public.washrooms.status IS 'Live availability. Driven by pins table and admin actions.';
COMMENT ON COLUMN public.washrooms.last_cleanliness IS 'Denormalised from feedback table. Updated by trigger.';
COMMENT ON COLUMN public.washrooms.verified IS 'true = peer-verified and visible on public map.';
COMMENT ON COLUMN public.washrooms.created_by IS 'The subscriber who submitted this washroom.';
