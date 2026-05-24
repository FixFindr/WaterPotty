-- ============================================================
-- 0004_create_feedback.sql
-- Water Potty — feedback table
--
-- Subscribers submit cleanliness ratings after using a washroom.
-- The most recent rating per washroom drives washrooms.last_cleanliness
-- (updated by trigger in 0010_triggers.sql).
--
-- note is optional free-text (subscribers only). It appears in the
-- PinBottomSheet as a community tip.
-- ============================================================

CREATE TABLE public.feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  washroom_id   uuid NOT NULL REFERENCES public.washrooms(id) ON DELETE CASCADE,
  cleanliness   text NOT NULL CHECK (cleanliness IN ('clean', 'dirty')),
  note          text CHECK (char_length(note) <= 280),  -- tweet-length cap
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_feedback_washroom_id ON public.feedback (washroom_id);
CREATE INDEX idx_feedback_user_id     ON public.feedback (user_id);
-- Latest-first for map queries (most recent rating per washroom)
CREATE INDEX idx_feedback_washroom_latest
  ON public.feedback (washroom_id, created_at DESC);

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.feedback IS 'Cleanliness ratings submitted by subscribers after using a washroom.';
COMMENT ON COLUMN public.feedback.cleanliness IS 'clean or dirty. Drives washrooms.last_cleanliness via trigger.';
COMMENT ON COLUMN public.feedback.note IS 'Optional community tip. Max 280 chars. Shown in bottom sheet.';
