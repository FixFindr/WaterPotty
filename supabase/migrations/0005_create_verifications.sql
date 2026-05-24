-- ============================================================
-- 0005_create_verifications.sql
-- Water Potty — verifications table
--
-- When a subscriber adds a new washroom it enters
-- pending_verification status. Another nearby subscriber
-- (or an admin) verifies it.
--
-- On approval:
--   • washrooms.verified = true
--   • washrooms.status   = 'open'
--   • +2 credits added to submitter via credit_ledger
--
-- On rejection:
--   • washroom is soft-deleted (status = 'closed')
--   • no credits awarded
--
-- photo_url stores an optional verification photo in
-- Supabase Storage (bucket: washroom-photos).
-- ============================================================

CREATE TABLE public.verifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  washroom_id   uuid NOT NULL REFERENCES public.washrooms(id) ON DELETE CASCADE,
  submitter_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verifier_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         text CHECK (char_length(notes) <= 500),
  photo_url     text,                             -- Supabase Storage public URL
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz                       -- set when status changes from pending
);

-- ── Only one pending verification per washroom at a time ─────────────────────

CREATE UNIQUE INDEX idx_verifications_one_pending_per_washroom
  ON public.verifications (washroom_id)
  WHERE status = 'pending';

-- ── Lookup indexes ────────────────────────────────────────────────────────────

CREATE INDEX idx_verifications_washroom_id  ON public.verifications (washroom_id);
CREATE INDEX idx_verifications_submitter_id ON public.verifications (submitter_id);
CREATE INDEX idx_verifications_verifier_id  ON public.verifications (verifier_id);
CREATE INDEX idx_verifications_status       ON public.verifications (status);

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.verifications IS 'Peer verification workflow for subscriber-submitted washrooms.';
COMMENT ON COLUMN public.verifications.submitter_id IS 'The subscriber who added the washroom.';
COMMENT ON COLUMN public.verifications.verifier_id IS 'The subscriber or admin who resolved the verification.';
COMMENT ON COLUMN public.verifications.photo_url IS 'Optional photo from Supabase Storage bucket washroom-photos.';
COMMENT ON COLUMN public.verifications.resolved_at IS 'Timestamp when status moved from pending to approved/rejected.';
