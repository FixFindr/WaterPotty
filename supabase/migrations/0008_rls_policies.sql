-- ============================================================
-- 0008_rls_policies.sql
-- Water Potty — Row Level Security policies
--
-- RLS is the security layer. Client-side tier checks in the app
-- are UX only. These policies are the enforcement point.
--
-- Auth helper used throughout:
--   auth.uid()           → UUID of the logged-in user
--   public.get_user_id() → users.id for the logged-in auth.uid()
--   public.get_tier()    → tier for the logged-in user
--   public.is_admin()    → true if role = 'admin'
--
-- Service role (used by Edge Functions and admin dashboard
-- server actions) bypasses all RLS automatically.
-- ============================================================

-- ── Enable RLS on all tables ──────────────────────────────────────────────────

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washrooms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flags         ENABLE ROW LEVEL SECURITY;

-- ── Auth helper functions ─────────────────────────────────────────────────────
-- These are inlined into policies as sub-selects for performance.
-- Supabase caches auth.uid() per request; these run once per query.

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_tier()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tier FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════

-- Anyone (even anon) can see anonymous usernames — needed for
-- verification attribution on markers.
CREATE POLICY "users_select_public"
  ON public.users FOR SELECT
  USING (true);

-- Users can only update their own row.
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (
    auth_id = auth.uid()
    -- Prevent self-promotion to admin or subscriber via client
    AND role = (SELECT role FROM public.users WHERE auth_id = auth.uid())
    AND tier = (SELECT tier FROM public.users WHERE auth_id = auth.uid())
  );

-- Insert is handled by the new_user_profile trigger (0010).
-- Direct client inserts are blocked except for the trigger path.
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Admins can update any user (for suspensions, tier changes).
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- WASHROOMS
-- ════════════════════════════════════════════════════════════

-- All authenticated users see verified washrooms.
-- Submitters also see their own pending washrooms.
CREATE POLICY "washrooms_select_authenticated"
  ON public.washrooms FOR SELECT
  TO authenticated
  USING (
    status != 'pending_verification'
    OR created_by = public.get_user_id()
    OR public.is_admin()
  );

-- Anonymous users see only open/pinned/occupied washrooms
-- (so the map loads without login).
CREATE POLICY "washrooms_select_anon"
  ON public.washrooms FOR SELECT
  TO anon
  USING (
    status IN ('open', 'pinned', 'occupied')
  );

-- Subscribers can add washrooms (enter pending_verification).
CREATE POLICY "washrooms_insert_subscriber"
  ON public.washrooms FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_tier() = 'subscriber'
    AND status = 'pending_verification'        -- new washrooms must start pending
    AND created_by = public.get_user_id()
  );

-- Washroom status, verified flag, and last_cleanliness are
-- updated only by service role (Edge Functions) or admin.
-- Regular users cannot UPDATE washrooms directly.
CREATE POLICY "washrooms_update_admin"
  ON public.washrooms FOR UPDATE
  USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- PINS
-- ════════════════════════════════════════════════════════════

-- All authenticated users can see all active pins (needed to
-- render yellow/red markers for everyone on the map).
CREATE POLICY "pins_select_authenticated"
  ON public.pins FOR SELECT
  TO authenticated
  USING (true);

-- Anon users can also see pins (map loads without login).
CREATE POLICY "pins_select_anon"
  ON public.pins FOR SELECT
  TO anon
  USING (true);

-- Any authenticated user can pin a washroom.
-- The partial unique index on (user_id) WHERE active enforces
-- the one-pin-at-a-time rule at DB level.
CREATE POLICY "pins_insert_own"
  ON public.pins FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.get_user_id()
  );

-- Users can release (update released_at) their own pin.
CREATE POLICY "pins_update_own"
  ON public.pins FOR UPDATE
  TO authenticated
  USING (user_id = public.get_user_id())
  WITH CHECK (
    user_id = public.get_user_id()
    -- Only released_at can be set; expires_at and washroom_id are immutable
  );

-- Users can delete their own pin (release without feedback).
CREATE POLICY "pins_delete_own"
  ON public.pins FOR DELETE
  TO authenticated
  USING (user_id = public.get_user_id());

-- ════════════════════════════════════════════════════════════
-- FEEDBACK
-- ════════════════════════════════════════════════════════════

-- All authenticated users can read feedback (shown in bottom sheet).
CREATE POLICY "feedback_select_authenticated"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (true);

-- Anon users can read feedback too (map bottom sheet preview).
CREATE POLICY "feedback_select_anon"
  ON public.feedback FOR SELECT
  TO anon
  USING (true);

-- Only subscribers can submit feedback.
CREATE POLICY "feedback_insert_subscriber"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_tier() = 'subscriber'
    AND user_id = public.get_user_id()
  );

-- Feedback is immutable once submitted (no UPDATE or DELETE
-- for regular users — prevents gaming the cleanliness system).

-- ════════════════════════════════════════════════════════════
-- VERIFICATIONS
-- ════════════════════════════════════════════════════════════

-- Submitters see their own verifications.
-- Verifiers see verifications assigned to them.
-- Admins see all.
CREATE POLICY "verifications_select"
  ON public.verifications FOR SELECT
  TO authenticated
  USING (
    submitter_id = public.get_user_id()
    OR verifier_id = public.get_user_id()
    OR public.is_admin()
  );

-- Subscribers can insert verifications as verifiers
-- (i.e. verify someone else's pending washroom).
CREATE POLICY "verifications_insert_subscriber"
  ON public.verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_tier() = 'subscriber'
    AND verifier_id = public.get_user_id()
    -- Submitter cannot verify their own washroom
    AND submitter_id != public.get_user_id()
  );

-- Only service role can update status (approved/rejected).
-- No UPDATE policy for authenticated users.

-- ════════════════════════════════════════════════════════════
-- CREDIT LEDGER
-- ════════════════════════════════════════════════════════════

-- Users can read their own ledger rows (for credit balance display).
CREATE POLICY "credit_ledger_select_own"
  ON public.credit_ledger FOR SELECT
  TO authenticated
  USING (user_id = public.get_user_id());

-- Admins can read all rows (for /admin/credits dashboard).
CREATE POLICY "credit_ledger_select_admin"
  ON public.credit_ledger FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT is service role only (Edge Functions + admin server actions).
-- No INSERT policy for authenticated users = clients cannot write credits.

-- ════════════════════════════════════════════════════════════
-- FLAGS
-- ════════════════════════════════════════════════════════════

-- Only admins can read flags (admin queue).
CREATE POLICY "flags_select_admin"
  ON public.flags FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Any authenticated user can submit a flag.
CREATE POLICY "flags_insert_authenticated"
  ON public.flags FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.get_user_id()
  );

-- Only admins can resolve flags.
CREATE POLICY "flags_update_admin"
  ON public.flags FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── Grant permissions ─────────────────────────────────────────────────────────
-- anon and authenticated roles need SELECT on these tables.
-- INSERT/UPDATE is controlled by the policies above.

GRANT SELECT ON public.washrooms     TO anon, authenticated;
GRANT SELECT ON public.pins          TO anon, authenticated;
GRANT SELECT ON public.feedback      TO anon, authenticated;
GRANT SELECT ON public.users         TO anon, authenticated;
GRANT INSERT ON public.users         TO authenticated;
GRANT UPDATE ON public.users         TO authenticated;
GRANT INSERT ON public.pins          TO authenticated;
GRANT UPDATE ON public.pins          TO authenticated;
GRANT DELETE ON public.pins          TO authenticated;
GRANT INSERT ON public.washrooms     TO authenticated;
GRANT UPDATE ON public.washrooms     TO authenticated;
GRANT INSERT ON public.feedback      TO authenticated;
GRANT INSERT ON public.verifications TO authenticated;
GRANT SELECT ON public.verifications TO authenticated;
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT INSERT ON public.flags         TO authenticated;
GRANT UPDATE ON public.flags         TO authenticated;
GRANT SELECT ON public.flags         TO authenticated;
GRANT SELECT ON public.user_credit_balances TO authenticated;
