-- ============================================================
-- 0003_create_pins.sql
-- Water Potty — pins table
--
-- A pin represents a user declaring "I am heading to / using
-- this washroom." It drives the yellow/red status on the map.
--
-- Business rules enforced here:
--   1. One active pin per user at a time (partial unique index).
--   2. expires_at defaults to now() + 30 minutes.
--   3. released_at is set when the user manually releases.
--   4. A pin is "active" when expires_at > now() AND
--      released_at IS NULL.
--
-- Status computation (done by Edge Function, not a column):
--   active_pin_count = 0 → washroom.status = 'open'
--   active_pin_count = 1 → washroom.status = 'pinned'
--   active_pin_count ≥ 2 → washroom.status = 'occupied'
-- ============================================================

CREATE TABLE public.pins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  washroom_id   uuid NOT NULL REFERENCES public.washrooms(id) ON DELETE CASCADE,
  pinned_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  released_at   timestamptz                       -- set by user or cron
);

-- ── One active pin per user (partial unique index) ────────────────────────────
-- A user can only have one unexpired, unreleased pin at a time.
-- Completed/expired pins are kept for history.

CREATE UNIQUE INDEX idx_pins_one_active_per_user
  ON public.pins (user_id)
  WHERE released_at IS NULL AND expires_at > now();

-- ── Lookup indexes ────────────────────────────────────────────────────────────

CREATE INDEX idx_pins_washroom_id  ON public.pins (washroom_id);
CREATE INDEX idx_pins_user_id      ON public.pins (user_id);
CREATE INDEX idx_pins_expires_at   ON public.pins (expires_at);

-- Composite for "active pins on this washroom" query
CREATE INDEX idx_pins_active_per_washroom
  ON public.pins (washroom_id, expires_at, released_at)
  WHERE released_at IS NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.pins IS 'User pins declaring intent to use a washroom. 30-min TTL.';
COMMENT ON COLUMN public.pins.expires_at IS 'Auto-set to now() + 30min. Cron deletes after this.';
COMMENT ON COLUMN public.pins.released_at IS 'Set when user taps "I am done". Null = still active.';
