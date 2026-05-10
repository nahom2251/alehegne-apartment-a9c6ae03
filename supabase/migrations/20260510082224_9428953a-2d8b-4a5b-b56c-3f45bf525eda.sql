CREATE TYPE public.utility_invoice_status AS ENUM ('draft', 'sent', 'paid');

CREATE TABLE public.utility_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  electricity_bill_id UUID,
  water_bill_id UUID,
  security_bill_id UUID,
  electricity_amount NUMERIC NOT NULL DEFAULT 0,
  water_amount NUMERIC NOT NULL DEFAULT 0,
  security_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status public.utility_invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (apartment_id, month, year)
);

ALTER TABLE public.utility_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage utility invoices"
ON public.utility_invoices
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR (has_role(auth.uid(), 'admin'::app_role) AND is_approved(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR (has_role(auth.uid(), 'admin'::app_role) AND is_approved(auth.uid())));

CREATE TRIGGER update_utility_invoices_updated_at
BEFORE UPDATE ON public.utility_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_utility_invoices_apartment ON public.utility_invoices(apartment_id);
CREATE INDEX idx_utility_invoices_period ON public.utility_invoices(year, month);