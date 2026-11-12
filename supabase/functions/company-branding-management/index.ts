import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type","Access-Control-Allow-Methods":"GET,PUT,OPTIONS"};
const roles=["owner","superadmin","admin"];
async function user(req:Request){const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))throw new Error("Autenticazione richiesta");const token=h.slice(7);const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw new Error("Sessione non valida");const {data:assurance,error:assuranceError}=await db.auth.mfa.getAuthenticatorAssuranceLevel(token);if(assuranceError||assurance?.currentLevel!=="aal2")throw new Error("Verifica MFA richiesta per la personalizzazione.");return data.user}
async function tenant(uid:string){
 const o=await db.from("aziende").select("id,owner_user_id,nome_app,ragione_sociale,slug,logo_url,sfondo_url,colori").eq("owner_user_id",uid).maybeSingle();if(o.error)throw o.error;if(o.data)return {a:o.data,role:"owner"};
 const m=await db.from("azienda_utenti").select("azienda_id,ruolo,attivo").eq("user_id",uid).eq("attivo",true).maybeSingle();if(m.error)throw m.error;if(!m.data||!roles.includes(m.data.ruolo))throw new Error("Accesso personalizzazione non autorizzato");
 const a=await db.from("aziende").select("id,owner_user_id,nome_app,ragione_sociale,slug,logo_url,sfondo_url,colori").eq("id",m.data.azienda_id).single();if(a.error)throw a.error;return {a:a.data,role:m.data.ruolo};
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const u=await user(req);const {a,role}=await tenant(u.id);if(req.method==="GET")return new Response(JSON.stringify({azienda:a,ruolo:role}),{headers:{...cors,"Content-Type":"application/json"}});
if(req.method!=="PUT")return new Response(JSON.stringify({error:"Metodo non consentito"}),{status:405,headers:{...cors,"Content-Type":"application/json"}});
const b=await req.json().catch(()=>({}));const clean=(x:any)=>String(x??"").trim();let colors=b.colori&&typeof b.colori==="object"?b.colori:{};const payload={nome_app:clean(b.nome_app)||a.nome_app,logo_url:clean(b.logo_url),sfondo_url:clean(b.sfondo_url),colori:colors,updated_at:new Date().toISOString()};
const {data,error}=await db.from("aziende").update(payload).eq("id",a.id).select("id,owner_user_id,nome_app,ragione_sociale,slug,logo_url,sfondo_url,colori").single();if(error)throw error;
return new Response(JSON.stringify({azienda:data,ruolo:role}),{headers:{...cors,"Content-Type":"application/json"}})}catch(e){const m=e instanceof Error?e.message:String(e);return new Response(JSON.stringify({error:m}),{status:/autenticazione|sessione|non autorizzato/i.test(m)?401:400,headers:{...cors,"Content-Type":"application/json"}})}});
