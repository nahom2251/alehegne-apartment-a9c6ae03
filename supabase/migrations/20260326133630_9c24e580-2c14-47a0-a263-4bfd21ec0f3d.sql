
-- Add tenant role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant';

-- Add tenant_user_id to apartments (no FK to auth.users per guidelines)
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS tenant_user_id uuid;

-- Add phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create payment_proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id uuid NOT NULL,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  bill_type text NOT NULL CHECK (bill_type IN ('rent', 'electricity', 'water')),
  bill_id uuid,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  month integer,
  year integer,
  amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Tenants see own proofs
CREATE POLICY "Tenants can view own payment proofs"
ON public.payment_proofs FOR SELECT
USING (auth.uid() = tenant_user_id);

-- Tenants can submit proofs
CREATE POLICY "Tenants can submit payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (auth.uid() = tenant_user_id);

-- Admins can manage all proofs
CREATE POLICY "Admins can manage payment proofs"
ON public.payment_proofs FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR (has_role(auth.uid(), 'admin'::app_role) AND is_approved(auth.uid())));

-- Storage bucket for payment proof images
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- RLS policy: tenants can view their own apartment
CREATE POLICY "Tenants can view own apartment"
ON public.apartments FOR SELECT
USING (tenant_user_id = auth.uid());

-- Function to register tenant
CREATE OR REPLACE FUNCTION public.register_tenant(
  _apartment_id uuid,
  _phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _apt record;
BEGIN
  SELECT * INTO _apt FROM apartments WHERE id = _apartment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apartment not found'; END IF;
  IF NOT _apt.is_occupied THEN RAISE EXCEPTION 'Apartment is not occupied'; END IF;
  IF _apt.tenant_user_id IS NOT NULL THEN RAISE EXCEPTION 'Apartment already has a registered tenant'; END IF;

  UPDATE apartments SET tenant_user_id = auth.uid() WHERE id = _apartment_id;
  UPDATE profiles SET status = 'approved', phone = _phone WHERE user_id = auth.uid();
  UPDATE user_roles SET role = 'tenant' WHERE user_id = auth.uid();
END;
$$;
