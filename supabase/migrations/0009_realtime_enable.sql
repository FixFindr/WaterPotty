-- ============================================================
-- 0009_realtime_enable.sql
-- Water Potty — Supabase Realtime publication setup
--
-- Enables Realtime broadcasts for the tables and columns that
-- drive live map updates. Only the columns that actually change
-- at runtime are included — this keeps broadcast payloads small.
--
-- Clients subscribe via:
--   supabase.channel('map-pins').on('postgres_changes', ...)
--   supabase.channel('map-washrooms').on('postgres_changes', ...)
--
-- NOTE: Supabase Realtime uses the supabase_realtime publication.
-- The publication must exist before tables can be added to it.
-- In a hosted Supabase project this publication exists by default.
-- If running locally with supabase start, it is created by
-- supabase/config.toml automatically.
-- ============================================================

-- ── Add tables to the Realtime publication ────────────────────────────────────

-- pins: INSERT and DELETE events drive yellow/red map colour changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;

-- washrooms: UPDATE events (status, last_cleanliness) patch markers in place
-- without a full map reload. Only relevant columns are broadcast.
ALTER PUBLICATION supabase_realtime ADD TABLE public.washrooms;

-- ── Column-level filtering (Postgres 15+) ─────────────────────────────────────
-- Supabase managed instances run Postgres 15. Column-level filtering
-- keeps broadcast payloads small — only changed columns are sent.
--
-- If your Supabase project runs Postgres 14, remove these two lines.
-- The full row will be broadcast instead (slightly larger payload, same behaviour).

ALTER PUBLICATION supabase_realtime
  SET TABLE public.washrooms (id, status, last_cleanliness, updated_at);

-- pins: broadcast the full row (it is small; column filtering not needed)
-- ALTER PUBLICATION supabase_realtime SET TABLE public.pins (...);
-- ^ not needed — full row broadcast is fine for pins

-- ── Replica identity ─────────────────────────────────────────────────────────
-- Supabase Realtime needs REPLICA IDENTITY FULL to include the OLD row in
-- UPDATE/DELETE events. Required for Realtime to send the before-image.

ALTER TABLE public.washrooms REPLICA IDENTITY FULL;
ALTER TABLE public.pins      REPLICA IDENTITY FULL;

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- The feedback and verifications tables are NOT added to Realtime.
-- Map clients poll these on demand (when the bottom sheet opens).
-- Adding them would create unnecessary broadcast traffic.
