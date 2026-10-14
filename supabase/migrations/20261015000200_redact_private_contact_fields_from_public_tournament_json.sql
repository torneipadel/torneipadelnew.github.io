-- Remove private contact and identity fields from public tournament configuration.
-- Applied to project dkeqicstprvvfebiaooc and verified with a synthetic JSON sample.
CREATE OR REPLACE FUNCTION private.sanitize_public_tournament_json(p_torneo_id bigint, p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_type text;
  v_key text;
  v_safe_key text;
  v_text text;
  v_value jsonb;
  v_out jsonb;
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;
  v_type := jsonb_typeof(p_value);

  IF v_type = 'object' THEN
    v_out := '{}'::jsonb;
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_value) LOOP
      -- Never expose participant contact details or identity documents through public tournament configuration.
      IF lower(v_key) ~ '(telefon|cellular|mobile|phone|whatsapp|indirizz|address|codice.?fiscale|partita.?iva|piva|(^|[^a-z])pec([^a-z]|$)|document|data.?nascita|birth.?date)' THEN
        CONTINUE;
      END IF;
      v_safe_key := private.sanitize_public_tournament_text(p_torneo_id, v_key);
      v_out := v_out || jsonb_build_object(
        v_safe_key,
        private.sanitize_public_tournament_json(p_torneo_id, v_value)
      );
    END LOOP;
    RETURN v_out;
  ELSIF v_type = 'array' THEN
    v_out := '[]'::jsonb;
    FOR v_value IN SELECT value FROM jsonb_array_elements(p_value) LOOP
      v_out := v_out || jsonb_build_array(
        private.sanitize_public_tournament_json(p_torneo_id, v_value)
      );
    END LOOP;
    RETURN v_out;
  ELSIF v_type = 'string' THEN
    v_text := p_value #>> '{}';
    IF position('@' in v_text) > 0 THEN
      RETURN to_jsonb(private.sanitize_public_tournament_text(p_torneo_id, v_text));
    END IF;
    RETURN p_value;
  ELSE
    RETURN p_value;
  END IF;
END;
$function$;
