-- ============================================================
-- 0001_create_users.sql
-- Water Potty — users table
--
-- Mirrors auth.users (Supabase Auth) with app-specific profile
-- fields. auth_id is the FK to auth.users.id.
--
-- anonymous_username is the ONLY field exposed publicly.
-- email is stored for internal use only and never shown to
-- other users.
-- ============================================================

CREATE TABLE public.users (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id                 uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_username      text UNIQUE NOT NULL,
  email                   text,                         -- private, never shown publicly
  role                    text NOT NULL DEFAULT 'user'
                            CHECK (role IN ('user', 'admin')),
  tier                    text NOT NULL DEFAULT 'free'
                            CHECK (tier IN ('free', 'subscriber')),
  subscription_expires_at timestamptz,                  -- null = never subscribed or expired
  revenuecat_customer_id  text,                         -- RevenueCat customer reference
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_users_auth_id   ON public.users (auth_id);
CREATE INDEX idx_users_role      ON public.users (role);
CREATE INDEX idx_users_tier      ON public.users (tier);
CREATE INDEX idx_users_username  ON public.users (anonymous_username);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE  public.users IS 'App user profiles. Mirrors auth.users with Water Potty-specific fields.';
COMMENT ON COLUMN public.users.auth_id IS 'FK to auth.users(id). Set on first login.';
COMMENT ON COLUMN public.users.anonymous_username IS 'Public-facing alias. Real identity never exposed.';
COMMENT ON COLUMN public.users.tier IS 'free = basic map access. subscriber = full community features.';
COMMENT ON COLUMN public.users.subscription_expires_at IS 'NULL if never subscribed. Set by RevenueCat webhook.';
