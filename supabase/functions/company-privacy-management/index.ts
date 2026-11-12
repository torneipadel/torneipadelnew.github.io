import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,PUT,OPTIONS" };
const allowed = ["owner", "superadmin", "admin"];
const fields = "id,slug,nome_app,ragione_sociale,sede,cf_piva,email,pec,titolare,dpo,privacy_text,cookie_text,termini_text";

async function authUser(req: Request) {
  const h = req.headers.get("Authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) throw new Error("Autenticazione richiesta");
  const token = h.slice(7).trim();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessione non valida");
  const { data: assurance, error: assuranceError } = await db.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Verifica MFA richiesta per la gestione Privacy.");
  return data.user;
}
async function tenantFor(userId: string, requestedId?: string) {
  if (requestedId) {
    const own = await db.from("aziende").select(fields).eq("id", requestedId).eq("owner_user_id", userId).maybeSingle();
    if (own.error) throw own.error;
    if (own.data) return { azienda: own.data, ruolo: "owner" };
    const membership = await db.from("azienda_utenti").select("azienda_id,ruolo,attivo")
      .eq("azienda_id", requestedId).eq("user_id", userId).eq("attivo", true).maybeSingle();
    if (membership.error) throw membership.error;
    if (membership.data && allowed.includes(String(membership.data.ruolo || ""))) {
      const company = await db.from("aziende").select(fields).eq("id", requestedId).maybeSingle();
      if (company.error) throw company.error;
      if (!company.data) throw new Error("Società non trovata");
      return { azienda: company.data, ruolo: membership.data.ruolo };
    }
    throw new Error("Accesso Privacy società non autorizzato");
  }

  const owned = await db.from("aziende").select(fields).eq("owner_user_id", userId).limit(2);
  if (owned.error) throw owned.error;
  if (owned.data?.length === 1) return { azienda: owned.data[0], ruolo: "owner" };
  if ((owned.data?.length || 0) > 1) throw new Error("Seleziona la società da gestire");
  const memberships = await db.from("azienda_utenti").select("azienda_id,ruolo,attivo")
    .eq("user_id", userId).eq("attivo", true).in("ruolo", allowed).limit(2);
  if (memberships.error) throw memberships.error;
  if (memberships.data?.length !== 1) throw new Error("Seleziona la società da gestire");
  const company = await db.from("aziende").select(fields).eq("id", memberships.data[0].azienda_id).maybeSingle();
  if (company.error) throw company.error;
  if (!company.data) throw new Error("Società non trovata");
  return { azienda: company.data, ruolo: memberships.data[0].ruolo };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  try {
    const user = await authUser(req);
    const requestedId = String(new URL(req.url).searchParams.get("azienda_id") || "").trim();
    const { azienda, ruolo } = await tenantFor(user.id, requestedId || undefined);
    if (req.method === "GET") return reply({ azienda, ruolo });
    if (req.method !== "PUT") return reply({ error: "Metodo non consentito" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.azienda_id && String(body.azienda_id) !== String(azienda.id)) return reply({ error: "Società selezionata non valida" }, 403);
    const clean = (v: unknown) => String(v ?? "").trim();
    const payload = {
      titolare: clean(body.titolare), dpo: clean(body.dpo), sede: clean(body.sede),
      cf_piva: clean(body.cf_piva), email: clean(body.email), pec: clean(body.pec),
      privacy_text: clean(body.privacy_text), cookie_text: clean(body.cookie_text),
      termini_text: clean(body.termini_text), updated_at: new Date().toISOString()
    };
    if (!payload.titolare || !payload.sede || !payload.cf_piva || !payload.email) return reply({ error: "Compila Titolare, sede, CF/P.IVA ed e-mail Privacy" }, 400);
    const { data, error } = await db.from("aziende").update(payload).eq("id", azienda.id).select(fields + ",updated_at").single();
    if (error) throw error;
    return reply({ azienda: data, ruolo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /autenticazione|sessione/i.test(msg) ? 401 : /non autorizzato|non valida/i.test(msg) ? 403 : 400;
    return reply({ error: msg }, status);
  }
});