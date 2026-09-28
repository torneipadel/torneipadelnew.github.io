-- Backup pre-fix: public.publish_my_company(uuid)
-- Supabase MASTER project: dkeqicstprvvfebiaooc
-- Captured 2026-09-29 before correcting the Privacy placeholder check.

CREATE OR REPLACE FUNCTION public.publish_my_company(p_azienda_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_id uuid; v_missing text[]:=array[]::text[];
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_azienda_id is not null then v_id:=p_azienda_id; else select id into v_id from public.aziende where owner_user_id=v_uid limit 1; end if;
 if v_id is null then raise exception 'COMPANY_NOT_FOUND'; end if;
 if not private.can_manage_azienda(v_id) then raise exception 'ACCESS_DENIED'; end if;
 select coalesce(array_agg(label order by ord),array[]::text[]) into v_missing from (
  select 1 ord,'Ragione sociale' label where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.ragione_sociale),'') is not null)
  union all select 2,'Nome app' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.nome_app),'') is not null)
  union all select 3,'Titolare' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.titolare),'') is not null)
  union all select 4,'Sede' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.sede),'') is not null)
  union all select 5,'CF/P.IVA' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.cf_piva),'') is not null)
  union all select 6,'Email aziendale' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.email),'') is not null)
  union all select 7,'Telefono' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.telefono),'') is not null)
  union all select 8,'Privacy' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.privacy_text),'') is not null and trim(a.privacy_text) not ilike '%[inserire%')
  union all select 9,'Cookie' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.cookie_text),'') is not null and trim(a.cookie_text) not ilike '%[inserire%')
  union all select 10,'Termini' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.termini_text),'') is not null and trim(a.termini_text) not ilike '%[inserire%')
 ) x;
 if cardinality(v_missing)>0 then return jsonb_build_object('ok',false,'published',false,'missing',v_missing); end if;
 update public.aziende set stato='attiva',updated_at=now() where id=v_id;
 return jsonb_build_object('ok',true,'published',true,'azienda_id',v_id);
end;
$function$;