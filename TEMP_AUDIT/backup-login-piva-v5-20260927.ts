import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const norm=(v:string)=>String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response(JSON.stringify({ok:false,error:"Metodo non consentito"}),{status:405,headers:cors});
 try{
  const body=await req.json();
  const identifier=norm(body?.identifier);
  const slug=String(body?.slug||"").trim().toLowerCase();
  if(!identifier&&!slug) return new Response(JSON.stringify({ok:false,error:"Identificativo mancante"}),{status:400,headers:cors});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{autoRefreshToken:false,persistSession:false}});
  let query=admin.from("aziende").select("id,ragione_sociale,nome_app,cf_piva,slug,logo_url,stato").eq("stato","attiva");
  const {data,error}=await query;
  if(error){console.error(error);return new Response(JSON.stringify({ok:false,error:"Errore di verifica"}),{status:500,headers:cors})}
  const azienda=(data||[]).find((a:any)=>identifier?norm(a.cf_piva)===identifier:String(a.slug||"").trim().toLowerCase()===slug);
  if(!azienda) return new Response(JSON.stringify({ok:false,error:"Società non trovata o non disponibile"}),{status:404,headers:cors});
  return new Response(JSON.stringify({ok:true,azienda:{id:azienda.id,ragione_sociale:azienda.ragione_sociale,nome_app:azienda.nome_app,cf_piva:azienda.cf_piva,slug:azienda.slug,logo_url:azienda.logo_url}}),{status:200,headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:"Errore di verifica"}),{status:500,headers:cors})}
});