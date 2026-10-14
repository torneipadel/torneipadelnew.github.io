import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json = (body: any, status = 200) => new Response(JSON.stringify(body), {status,headers:{...cors,"Content-Type":"application/json"}});
const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const roles = ["owner","admin","superadmin"];

async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const {data,error} = await admin.auth.admin.listUsers({page,perPage:1000});
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u:any) => String(u.email || "").trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) return null;
  }
  throw new Error("Ricerca utenti troppo ampia: contatta il supporto.");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  if (req.method !== "POST") return json({error:"Metodo non supportato"},405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i,"");
    if (!token) return json({error:"Autenticazione richiesta"},401);
    const callerClient = createClient(url,Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user:caller},error:authError} = await callerClient.auth.getUser(token);
    if (authError || !caller) return json({error:"Sessione non valida"},401);

    const body = await req.json();
    const action = String(body.action || "");
    const requestedCompany = String(body.azienda_id || body.company_id || "").trim();
    const {data:members,error:memberError} = await admin.from("azienda_utenti").select("azienda_id,ruolo,attivo").eq("user_id",caller.id).eq("attivo",true);
    if (memberError) throw memberError;
    const allowed = (members || []).filter((m:any) => roles.includes(String(m.ruolo || "").toLowerCase()));
    let membership:any = null;
    if (requestedCompany) {
      membership = allowed.find((m:any) => String(m.azienda_id) === requestedCompany) || null;
      if (!membership) return json({error:"Non sei autorizzato a gestire gli utenti della società selezionata."},403);
    } else {
      const ids = [...new Set(allowed.map((m:any) => String(m.azienda_id)))];
      if (!ids.length) return json({error:"Non autorizzato"},403);
      if (ids.length > 1) return json({error:"Seleziona prima la società dalla Dashboard, poi riapri Utenti della società.",code:"TENANT_SELECTION_REQUIRED"},400);
      membership = allowed.find((m:any) => String(m.azienda_id) === ids[0]) || null;
    }
    if (!membership) return json({error:"Non autorizzato"},403);
    const aziendaId = String(membership.azienda_id);
    const callerRole = String(membership.ruolo || "").toLowerCase();
    const {data:company,error:companyError} = await admin.from("aziende").select("id,stato").eq("id",aziendaId).maybeSingle();
    if (companyError) throw companyError;
    if (!company || !["attiva","configurazione"].includes(String(company.stato || "").toLowerCase())) return json({error:"La società non è disponibile per la gestione degli utenti."},403);

    if (action === "list") {
      const {data:rows,error} = await admin.from("azienda_utenti").select("azienda_id,user_id,ruolo,attivo,created_at").eq("azienda_id",aziendaId).order("created_at");
      if (error) throw error;
      const {data:userData,error:userError} = await admin.auth.admin.listUsers({perPage:1000});
      if (userError) throw userError;
      const map = new Map((userData?.users || []).map((u:any) => [u.id,u]));
      return json({azienda_id:aziendaId,caller_role:callerRole,users:(rows || []).map((r:any) => {
        const u:any = map.get(r.user_id);
        return {user_id:r.user_id,ruolo:r.ruolo,attivo:r.attivo,created_at:r.created_at,email:u?.email || "",nome:u?.user_metadata?.nome || "",cognome:u?.user_metadata?.cognome || ""};
      })});
    }

    if (action === "create") {
      if (callerRole !== "owner") return json({error:"Solo il proprietario può creare utenti, amministratori e superadmin della società."},403);
      const email = String(body.email || "").trim().toLowerCase();
      const nome = String(body.nome || "").trim();
      const cognome = String(body.cognome || "").trim();
      const ruolo = ["admin","superadmin"].includes(String(body.ruolo || "")) ? String(body.ruolo) : "user";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Inserisci un indirizzo email valido."},400);
      const existing = await findAuthUserByEmail(email);
      if (existing) {
        const {data:existingMembership,error:existingError} = await admin.from("azienda_utenti").select("ruolo,attivo").eq("azienda_id",aziendaId).eq("user_id",existing.id).maybeSingle();
        if (existingError) throw existingError;
        if (existingMembership?.attivo) return json({error:"Questo utente appartiene già alla società selezionata."},409);
        if (existingMembership && existingMembership.attivo === false) return json({error:"L'utente ha già un'appartenenza disattivata. Riattivala dalla lista utenti."},409);
        const {error:linkError} = await admin.from("azienda_utenti").insert({azienda_id:aziendaId,user_id:existing.id,ruolo,attivo:true});
        if (linkError) throw linkError;
        return json({ok:true,user_id:existing.id,email,ruolo,already_exists:true});
      }
      const {data:invited,error:inviteError} = await admin.auth.admin.inviteUserByEmail(email,{data:{nome,cognome,tenant_invite:true,tenant_role:ruolo}});
      if (inviteError) throw inviteError;
      const created = invited?.user;
      if (!created?.id) return json({error:"Invito creato senza identificativo utente."},500);
      const {error:insertError} = await admin.from("azienda_utenti").insert({azienda_id:aziendaId,user_id:created.id,ruolo,attivo:true});
      if (insertError) return json({error:"L'invito è stato creato, ma l'associazione alla società non è riuscita: "+insertError.message, user_id:created.id},500);
      await admin.from("profili").update({nome:nome || null,cognome:cognome || null,email}).eq("user_id",created.id);
      return json({ok:true,user_id:created.id,email,ruolo,already_exists:false});
    }

    if (action === "role") {
      const target = String(body.user_id || "");
      const ruolo = ["admin","superadmin","user"].includes(String(body.ruolo || "")) ? String(body.ruolo) : "user";
      if (callerRole !== "owner") return json({error:"Solo il proprietario può modificare i ruoli."},403);
      if (target === caller.id) return json({error:"Il proprietario non può modificare il proprio ruolo."},400);
      const {data:targetRow,error:targetError} = await admin.from("azienda_utenti").select("ruolo").eq("azienda_id",aziendaId).eq("user_id",target).maybeSingle();
      if (targetError) throw targetError;
      if (!targetRow) return json({error:"Utente non appartenente alla società."},404);
      if (String(targetRow.ruolo || "").toLowerCase() === "owner") return json({error:"Il ruolo del proprietario non può essere modificato da questa schermata."},400);
      const {error} = await admin.from("azienda_utenti").update({ruolo}).eq("azienda_id",aziendaId).eq("user_id",target);
      if (error) throw error;
      return json({ok:true});
    }

    if (action === "active") {
      const target = String(body.user_id || "");
      const attivo = Boolean(body.attivo);
      if (callerRole !== "owner") return json({error:"Solo il proprietario può attivare o disattivare utenti."},403);
      if (target === caller.id) return json({error:"Il proprietario non può disattivare se stesso."},400);
      const {data:targetRow,error:targetError} = await admin.from("azienda_utenti").select("ruolo").eq("azienda_id",aziendaId).eq("user_id",target).maybeSingle();
      if (targetError) throw targetError;
      if (!targetRow) return json({error:"Utente non appartenente alla società."},404);
      if (String(targetRow.ruolo || "").toLowerCase() === "owner") return json({error:"Il proprietario non può essere disattivato da questa schermata."},400);
      const {error} = await admin.from("azienda_utenti").update({attivo}).eq("azienda_id",aziendaId).eq("user_id",target);
      if (error) throw error;
      return json({ok:true});
    }

    return json({error:"Azione non supportata."},400);
  } catch (e) {
    console.error(e);
    return json({error:e instanceof Error ? e.message : String(e)},500);
  }
});