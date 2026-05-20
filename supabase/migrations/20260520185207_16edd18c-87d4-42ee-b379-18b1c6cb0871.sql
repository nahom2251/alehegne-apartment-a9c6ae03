
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_elec_apt_year_month ON public.electricity_bills (apartment_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_water_apt_year_month ON public.water_bills (apartment_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_sec_apt_year_month ON public.security_bills (apartment_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_rent_bills_apt_year_month ON public.rent_bills (apartment_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_rent_payments_apt ON public.rent_payments (apartment_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_utility_invoices_apt_year_month ON public.utility_invoices (apartment_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_apartments_tenant_user ON public.apartments (tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_apartments_tenant_phone ON public.apartments (tenant_phone);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_tenant ON public.payment_proofs (tenant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs (status);

-- Password reset request table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | used
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_prr_email_status ON public.password_reset_requests (email, status);
CREATE INDEX IF NOT EXISTS idx_prr_status_created ON public.password_reset_requests (status, created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reset requests"
ON public.password_reset_requests
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RPC: anyone (anon) can submit a reset request by email
CREATE OR REPLACE FUNCTION public.submit_password_reset_request(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _req_id uuid;
BEGIN
  SELECT user_id INTO _user_id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'No account found for this email';
  END IF;

  -- prevent multiple open pending requests
  UPDATE public.password_reset_requests
  SET status = 'rejected', reviewed_at = now()
  WHERE email = _email AND status = 'pending';

  INSERT INTO public.password_reset_requests (email, user_id, status)
  VALUES (_email, _user_id, 'pending')
  RETURNING id INTO _req_id;

  RETURN _req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_password_reset_request(text) TO anon, authenticated;

-- RPC: check if an approved request exists for an email
CREATE OR REPLACE FUNCTION public.check_password_reset_approved(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.password_reset_requests
    WHERE lower(email) = lower(_email) AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_password_reset_approved(text) TO anon, authenticated;
