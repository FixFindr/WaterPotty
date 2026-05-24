-- ============================================================
-- 0010_triggers.sql
-- Water Potty — Database triggers
--
-- 1. new_user_profile       — creates users row on auth sign-up
-- 2. update_washroom_status — recalculates status after pin change
-- 3. denorm_last_cleanliness — updates washrooms.last_cleanliness
--                              after feedback INSERT
-- 4. handle_verification_approved — fires credit award and
--                              washroom activation on approval
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. AUTO-CREATE USER PROFILE ON SIGN-UP
--    Fires when Supabase Auth creates a new auth.users row.
--    Creates a stub users row so the user exists in the DB
--    before the onboarding screen upserts the username.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (auth_id, anonymous_username, email)
  VALUES (
    NEW.id,
    -- Temporary username; overwritten during onboarding
    'user_' || substr(NEW.id::text, 1, 8),
    NEW.email
  )
  ON CONFLICT (auth_id) DO NOTHING;  -- idempotent: social re-logins are safe
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ════════════════════════════════════════════════════════════
-- 2. RECALCULATE WASHROOM STATUS AFTER PIN CHANGE
--    Fires after INSERT, UPDATE, or DELETE on pins.
--    Counts active pins on the affected washroom and sets
--    the correct status.
--
--    "active pin" = released_at IS NULL AND expires_at > now()
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.recalculate_washroom_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_washroom_id   uuid;
  v_active_count  integer;
  v_new_status    text;
BEGIN
  -- Determine which washroom was affected
  v_washroom_id := COALESCE(NEW.washroom_id, OLD.washroom_id);

  -- Count active (unexpired, unreleased) pins on that washroom
  SELECT COUNT(*)
  INTO   v_active_count
  FROM   public.pins
  WHERE  washroom_id  = v_washroom_id
    AND  released_at IS NULL
    AND  expires_at  > now();

  -- Map count → status
  v_new_status := CASE
    WHEN v_active_count = 0 THEN 'open'
    WHEN v_active_count = 1 THEN 'pinned'
    ELSE                         'occupied'
  END;

  -- Only write if status actually changed (avoids no-op Realtime broadcasts)
  UPDATE public.washrooms
  SET    status     = v_new_status,
         updated_at = now()
  WHERE  id         = v_washroom_id
    AND  status    != v_new_status
    -- Never overwrite closed status via pin changes
    AND  status    != 'closed';

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER pins_recalculate_status
  AFTER INSERT OR UPDATE OR DELETE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_washroom_status();


-- ════════════════════════════════════════════════════════════
-- 3. DENORMALISE last_cleanliness AFTER FEEDBACK INSERT
--    Updates washrooms.last_cleanliness to the most recent
--    feedback entry. Runs after every feedback INSERT.
--    Keeps the map marker in sync without extra queries.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_last_cleanliness()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.washrooms
  SET    last_cleanliness = NEW.cleanliness,
         updated_at       = now()
  WHERE  id               = NEW.washroom_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_update_cleanliness
  AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_last_cleanliness();


-- ════════════════════════════════════════════════════════════
-- 4. HANDLE VERIFICATION APPROVAL
--    Fires after verifications.status is set to 'approved'
--    or 'rejected'. On approval:
--      a) activates the washroom (verified=true, status=open)
--      b) awards +2 credits to the submitter via credit_ledger
--    On rejection:
--      a) closes the washroom (status=closed)
--    Sets resolved_at on the verification row.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_verification_resolved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when status transitions FROM pending TO approved/rejected
  IF OLD.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Stamp resolved_at
  NEW.resolved_at := now();

  IF NEW.status = 'approved' THEN
    -- Activate the washroom
    UPDATE public.washrooms
    SET    verified   = true,
           status     = 'open',
           updated_at = now()
    WHERE  id         = NEW.washroom_id;

    -- Award +2 credits to the submitter (append-only ledger)
    INSERT INTO public.credit_ledger (user_id, delta, reason, reference_id)
    VALUES (
      NEW.submitter_id,
      2,
      'washroom_verified',
      NEW.id           -- reference_id = verification row
    );

  ELSIF NEW.status = 'rejected' THEN
    -- Close the washroom — it won't appear on the public map
    UPDATE public.washrooms
    SET    status     = 'closed',
           updated_at = now()
    WHERE  id         = NEW.washroom_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER verifications_on_resolved
  BEFORE UPDATE OF status ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_resolved();


-- ════════════════════════════════════════════════════════════
-- 5. PREVENT CREDIT LEDGER MUTATION
--    The ledger is append-only. Block UPDATE and DELETE on
--    credit_ledger for all roles (service role included).
--    Only INSERTs are permitted.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.block_credit_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'credit_ledger is append-only. UPDATE and DELETE are not permitted. '
    'Create a new correcting entry instead.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER credit_ledger_no_update
  BEFORE UPDATE ON public.credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_credit_ledger_mutation();

CREATE TRIGGER credit_ledger_no_delete
  BEFORE DELETE ON public.credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.block_credit_ledger_mutation();
