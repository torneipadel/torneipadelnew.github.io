-- Preserve the database-enforced approval boundary for tournament registrations.
CREATE OR REPLACE FUNCTION public.protect_iscrizione_approval_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_azienda_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_azienda_id := COALESCE(NEW.azienda_id, OLD.azienda_id);
  ELSE
    v_azienda_id := NEW.azienda_id;
  END IF;

  IF COALESCE(public.is_superadmin(), false)
     OR COALESCE(private.can_manage_azienda(v_azienda_id), false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approvato := false;
    IF lower(trim(COALESCE(NEW.stato, ''))) IN ('approvato', 'approved') THEN
      NEW.stato := 'richiesta';
    END IF;
  ELSE
    IF NEW.approvato IS DISTINCT FROM OLD.approvato
       OR NEW.stato IS DISTINCT FROM OLD.stato THEN
      RAISE EXCEPTION 'Solo gli amministratori della società possono modificare lo stato di approvazione.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_iscrizioni_protect_approval ON public.iscrizioni;
CREATE TRIGGER trg_iscrizioni_protect_approval
  BEFORE INSERT OR UPDATE ON public.iscrizioni
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_iscrizione_approval_fields();
