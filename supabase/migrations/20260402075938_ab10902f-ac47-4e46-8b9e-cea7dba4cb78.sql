
CREATE OR REPLACE FUNCTION public.lookup_tenant_by_phone(_phone text)
RETURNS TABLE(apartment_id uuid, apartment_label text, tenant_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.label, a.tenant_name
  FROM apartments a
  WHERE a.tenant_phone = _phone
    AND a.is_occupied = true
    AND a.tenant_user_id IS NULL
  LIMIT 1;
$$;
