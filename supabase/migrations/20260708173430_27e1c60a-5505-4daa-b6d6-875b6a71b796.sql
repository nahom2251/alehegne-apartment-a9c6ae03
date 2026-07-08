
ALTER TABLE public.water_bills ADD CONSTRAINT water_bills_apt_month_year_unique UNIQUE (apartment_id, month, year);
ALTER TABLE public.electricity_bills ADD CONSTRAINT electricity_bills_apt_month_year_unique UNIQUE (apartment_id, month, year);
ALTER TABLE public.security_bills ADD CONSTRAINT security_bills_apt_month_year_unique UNIQUE (apartment_id, month, year);
ALTER TABLE public.rent_bills ADD CONSTRAINT rent_bills_apt_month_year_unique UNIQUE (apartment_id, month, year);
