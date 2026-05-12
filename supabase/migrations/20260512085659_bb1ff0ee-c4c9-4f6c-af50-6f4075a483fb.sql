ALTER TABLE public.rent_bills ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE public.electricity_bills ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE public.water_bills ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE public.security_bills ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE public.utility_invoices ADD COLUMN IF NOT EXISTS tenant_name text;