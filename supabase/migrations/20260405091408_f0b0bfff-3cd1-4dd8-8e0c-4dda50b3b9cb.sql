
CREATE TABLE public.security_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES public.apartments(id) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security bills" ON public.security_bills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenants can view own security bills" ON public.security_bills
  FOR SELECT TO authenticated
  USING (
    apartment_id IN (
      SELECT id FROM public.apartments WHERE tenant_user_id = auth.uid()
    )
  );
