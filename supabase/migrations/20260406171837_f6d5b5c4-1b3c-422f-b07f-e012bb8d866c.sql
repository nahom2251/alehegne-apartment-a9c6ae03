
CREATE TABLE public.rent_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(apartment_id, month, year)
);

ALTER TABLE public.rent_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rent bills"
  ON public.rent_bills FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenants can view own rent bills"
  ON public.rent_bills FOR SELECT
  TO authenticated
  USING (apartment_id IN (
    SELECT id FROM apartments WHERE tenant_user_id = auth.uid()
  ));
