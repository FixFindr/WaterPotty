-- ============================================================
-- 0011_cron_and_storage.sql
-- Water Potty — pg_cron schedule + Supabase Storage buckets
--
-- pg_cron runs inside Postgres on Supabase managed instances.
-- It is pre-installed on all Supabase projects.
--
-- Jobs defined here:
--   1. expire_pins       — every 5 min: clean up expired pins
--   2. notify_expiring   — every 5 min: find pins expiring in
--                          5-10 min and queue push notifications
--                          (actual push send is in Edge Function)
--
-- Storage buckets:
--   washroom-photos      — verification images (private, signed URLs)
-- ============================================================

-- ── Enable pg_cron extension ──────────────────────────────────────────────────
-- pg_cron is already enabled on hosted Supabase. This is a no-op
-- if it's already installed, and safe to include for completeness.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── 1. Expire stale pins every 5 minutes ─────────────────────────────────────
-- Sets released_at on all pins that have passed their expires_at
-- time. The recalculate_washroom_status trigger fires on each
-- UPDATE and resets the washroom to 'open' automatically.
--
-- Why UPDATE rather than DELETE?
-- Keeping released rows preserves usage history for analytics
-- and the admin dashboard. The partial unique index only counts
-- rows where released_at IS NULL, so history rows don't conflict.

SELECT cron.schedule(
  'expire-pins',        -- job name (unique)
  '*/5 * * * *',        -- every 5 minutes
  $$
    UPDATE public.pins
    SET    released_at = now()
    WHERE  released_at IS NULL
      AND  expires_at  < now();
  $$
);

-- ── 2. Mark pins expiring in 5–10 minutes for notification ───────────────────
-- Inserts a row into a notification_queue table (created below).
-- The pin-expiry-cron Edge Function reads this queue and sends
-- push notifications via Expo, then deletes the processed rows.

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  washroom_id   uuid NOT NULL REFERENCES public.washrooms(id) ON DELETE CASCADE,
  type          text NOT NULL
                  CHECK (type IN ('pin_expiring_soon', 'verification_needed')),
  sent          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_queue_unsent ON public.notification_queue (sent, created_at)
  WHERE sent = false;

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
-- No RLS policies for authenticated users — service role only.

SELECT cron.schedule(
  'queue-expiry-notifications',
  '*/5 * * * *',
  $$
    -- Queue notifications for pins expiring in the next 5–10 minutes
    -- (gives the push notification time to arrive before the pin dies)
    INSERT INTO public.notification_queue (user_id, washroom_id, type)
    SELECT DISTINCT
      p.user_id,
      p.washroom_id,
      'pin_expiring_soon'
    FROM public.pins p
    WHERE p.released_at IS NULL
      AND p.expires_at BETWEEN now() + INTERVAL '5 minutes'
                           AND now() + INTERVAL '10 minutes'
      -- Don't re-queue if already queued in the last 10 minutes
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_queue nq
        WHERE nq.user_id    = p.user_id
          AND nq.washroom_id = p.washroom_id
          AND nq.type       = 'pin_expiring_soon'
          AND nq.created_at > now() - INTERVAL '10 minutes'
      );
  $$
);

-- ── Supabase Storage buckets ──────────────────────────────────────────────────
-- Buckets are managed via the Supabase Storage API, not SQL directly.
-- Run this via the Supabase JS client in a seed script, or create
-- manually in the Supabase dashboard under Storage.
--
-- Bucket config (for reference — apply via dashboard or seed.ts):
--
--   name:         washroom-photos
--   public:       false          (signed URLs used for verification images)
--   fileSizeLimit: 5242880       (5 MB per image)
--   allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
--
-- Storage RLS policies (apply via dashboard):
--   INSERT: authenticated users can upload to washroom-photos/{user_id}/*
--   SELECT: authenticated users can read their own uploads;
--           service role can read all (for admin verification review)

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.notification_queue IS
  'Transient queue of push notifications to send. Read and cleared by pin-expiry-cron Edge Function.';
