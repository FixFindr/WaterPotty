-- ============================================================
-- 0007_create_flags.sql
-- Water Potty — flags table
--
-- Users can flag a washroom to report problems. Flags enter
-- an admin review queue (visible in the admin dashboard at
-- /admin/flags).
--
-- Resolution actions (taken by admin):
--   • close_washroom  → washrooms.status = 'closed'
--   • dismiss         → flag marked resolved, washroom unchanged
--
-- Multiple users can flag the same washroom. Each gets its
-- own row. Admin resolves them together.
-- ============================================================

CREATE TABLE public.flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  washroom_id   uuid NOT NULL REFERENCES public.washrooms(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason        text NOT NULL
                  CHECK (reason IN (
                    'closed_permanently',
                    'doesnt_exist',
                    'incorrect_info',
                    'inappropriate'
                  )),
  note          text CHECK (char_length(note) <= 500),
  resolved      boolean NOT NULL DEFAULT false,
  resolved_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_flags_washroom_id ON public.flags (washroom_id);
CREATE INDEX idx_flags_user_id     ON public.flags (user_id);
CREATE INDEX idx_flags_resolved    ON public.flags (resolved) WHERE resolved = false;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.flags IS 'User-submitted problem reports for washrooms. Reviewed by admins.';
COMMENT ON COLUMN public.flags.reason IS 'Why the user flagged this washroom.';
COMMENT ON COLUMN public.flags.resolved IS 'false = in admin queue. true = actioned.';
COMMENT ON COLUMN public.flags.resolved_by IS 'Admin user who resolved this flag.';
