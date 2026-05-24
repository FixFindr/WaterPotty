-- ============================================================
-- 0006_create_credit_ledger.sql
-- Water Potty — credit_ledger table
--
-- Append-only double-entry ledger. Credit balance is always
-- computed as SUM(delta) — never stored as a column. This gives
-- a full audit trail and makes manual adjustments trivial.
--
-- reason values:
--   washroom_verified      — peer approved a submission (+2)
--   subscription_renewal   — credits used instead of payment (-5)
--   subscription_partial   — partial credit redemption (-n)
--   manual_admin_adjust    — admin override (±n)
--   bonus                  — promotional / referral (future)
--
-- reference_id is polymorphic: points to verifications.id for
-- washroom_verified rows, or null for subscription rows.
-- ============================================================

CREATE TABLE public.credit_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta         integer NOT NULL
                  CHECK (delta != 0),              -- no zero-value entries
  reason        text NOT NULL
                  CHECK (reason IN (
                    'washroom_verified',
                    'subscription_renewal',
                    'subscription_partial',
                    'manual_admin_adjust',
                    'bonus'
                  )),
  reference_id  uuid,                              -- optional FK (verification, etc.)
  note          text,                              -- admin note for manual adjustments
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_credit_ledger_user_id    ON public.credit_ledger (user_id);
CREATE INDEX idx_credit_ledger_reason     ON public.credit_ledger (reason);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger (user_id, created_at DESC);

-- ── Helper view: current credit balance per user ──────────────────────────────
-- Used by admin dashboard and the RevenueCat webhook renewal logic.

CREATE VIEW public.user_credit_balances AS
SELECT
  user_id,
  SUM(delta)::integer AS credits
FROM public.credit_ledger
GROUP BY user_id;

COMMENT ON VIEW public.user_credit_balances IS
  'Computed credit balance per user. Always read from this view, never cache in users table.';

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.credit_ledger IS 'Append-only credit ledger. Balance = SUM(delta) per user.';
COMMENT ON COLUMN public.credit_ledger.delta IS 'Positive = earned, negative = spent. Zero not allowed.';
COMMENT ON COLUMN public.credit_ledger.reference_id IS 'Optional: points to verifications.id or other related record.';
COMMENT ON COLUMN public.credit_ledger.note IS 'Human-readable note, required for manual_admin_adjust rows.';
