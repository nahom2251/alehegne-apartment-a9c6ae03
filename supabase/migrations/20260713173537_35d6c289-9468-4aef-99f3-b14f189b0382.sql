
-- Sync utility_invoice status <-> underlying bills' is_paid

CREATE OR REPLACE FUNCTION public.recalc_utility_invoice_status(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  elec_paid boolean := true;
  water_paid boolean := true;
  sec_paid boolean := true;
  all_paid boolean;
  any_present boolean;
BEGIN
  SELECT * INTO inv FROM utility_invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN RETURN; END IF;

  any_present := (inv.electricity_bill_id IS NOT NULL) OR (inv.water_bill_id IS NOT NULL) OR (inv.security_bill_id IS NOT NULL);
  IF NOT any_present THEN RETURN; END IF;

  IF inv.electricity_bill_id IS NOT NULL THEN
    SELECT COALESCE(is_paid,false) INTO elec_paid FROM electricity_bills WHERE id = inv.electricity_bill_id;
  END IF;
  IF inv.water_bill_id IS NOT NULL THEN
    SELECT COALESCE(is_paid,false) INTO water_paid FROM water_bills WHERE id = inv.water_bill_id;
  END IF;
  IF inv.security_bill_id IS NOT NULL THEN
    SELECT COALESCE(is_paid,false) INTO sec_paid FROM security_bills WHERE id = inv.security_bill_id;
  END IF;

  all_paid := elec_paid AND water_paid AND sec_paid;

  IF all_paid AND inv.status <> 'paid' THEN
    UPDATE utility_invoices SET status='paid', paid_at=COALESCE(paid_at, now()) WHERE id=_invoice_id;
  ELSIF (NOT all_paid) AND inv.status = 'paid' THEN
    UPDATE utility_invoices SET status='sent', paid_at=NULL WHERE id=_invoice_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_invoice_from_bill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_id uuid;
  col text;
BEGIN
  IF TG_TABLE_NAME = 'electricity_bills' THEN col := 'electricity_bill_id';
  ELSIF TG_TABLE_NAME = 'water_bills' THEN col := 'water_bill_id';
  ELSIF TG_TABLE_NAME = 'security_bills' THEN col := 'security_bill_id';
  END IF;

  FOR inv_id IN EXECUTE format('SELECT id FROM utility_invoices WHERE %I = $1', col) USING NEW.id LOOP
    PERFORM public.recalc_utility_invoice_status(inv_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_elec ON public.electricity_bills;
CREATE TRIGGER trg_sync_invoice_elec
AFTER UPDATE OF is_paid ON public.electricity_bills
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_from_bill();

DROP TRIGGER IF EXISTS trg_sync_invoice_water ON public.water_bills;
CREATE TRIGGER trg_sync_invoice_water
AFTER UPDATE OF is_paid ON public.water_bills
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_from_bill();

DROP TRIGGER IF EXISTS trg_sync_invoice_sec ON public.security_bills;
CREATE TRIGGER trg_sync_invoice_sec
AFTER UPDATE OF is_paid ON public.security_bills
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_from_bill();

-- When utility_invoice status changes, sync underlying bills
CREATE OR REPLACE FUNCTION public.sync_bills_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    IF NEW.electricity_bill_id IS NOT NULL THEN
      UPDATE electricity_bills SET is_paid=true, paid_at=COALESCE(paid_at, now_ts) WHERE id=NEW.electricity_bill_id AND COALESCE(is_paid,false)=false;
    END IF;
    IF NEW.water_bill_id IS NOT NULL THEN
      UPDATE water_bills SET is_paid=true, paid_at=COALESCE(paid_at, now_ts) WHERE id=NEW.water_bill_id AND COALESCE(is_paid,false)=false;
    END IF;
    IF NEW.security_bill_id IS NOT NULL THEN
      UPDATE security_bills SET is_paid=true, paid_at=COALESCE(paid_at, now_ts) WHERE id=NEW.security_bill_id AND COALESCE(is_paid,false)=false;
    END IF;
  ELSIF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    IF NEW.electricity_bill_id IS NOT NULL THEN
      UPDATE electricity_bills SET is_paid=false, paid_at=NULL WHERE id=NEW.electricity_bill_id;
    END IF;
    IF NEW.water_bill_id IS NOT NULL THEN
      UPDATE water_bills SET is_paid=false, paid_at=NULL WHERE id=NEW.water_bill_id;
    END IF;
    IF NEW.security_bill_id IS NOT NULL THEN
      UPDATE security_bills SET is_paid=false, paid_at=NULL WHERE id=NEW.security_bill_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bills_from_invoice ON public.utility_invoices;
CREATE TRIGGER trg_sync_bills_from_invoice
AFTER UPDATE OF status ON public.utility_invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_bills_from_invoice();

-- Backfill: recalc all invoices once
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM utility_invoices LOOP
    PERFORM public.recalc_utility_invoice_status(r.id);
  END LOOP;
END $$;
