-- Add must_change_password flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Update register_tenant RPC to also set must_change_password = true (for admin-driven password) ...
-- We'll handle that via a NEW RPC for the new flow:
-- create_tenant_account: SECURITY DEFINER function that:
--   * looks up apartment by phone
--   * validates not already linked
--   * creates auth user via admin (NOT possible from SQL — we need an edge function)
-- 
-- Plan adjustment: Since we cannot create auth users from SQL, the client will:
--   1. Call lookup_tenant_by_phone (existing)
--   2. Generate email + password client-side
--   3. supabase.auth.signUp() to create user
--   4. Call register_tenant (existing) to link apartment + approve + tenant role
--   5. Mark profile must_change_password = true
--
-- Add helper RPC to set must_change_password during registration (SECURITY DEFINER
-- so it works right after signup before session is fully settled).

CREATE OR REPLACE FUNCTION public.mark_must_change_password(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET must_change_password = true
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET must_change_password = false
  WHERE user_id = auth.uid();
END;
$$;