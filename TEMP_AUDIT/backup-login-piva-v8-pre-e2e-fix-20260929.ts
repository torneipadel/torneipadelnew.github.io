import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

const norm=(v:string)=>String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return new Response(JSON.stringify({ok:false,error:"Metodo non consentito"}),{status:405,headers:cors});

  try{
    const body=await req.json();
    const identifier=norm(body?.identifier);
    const slug=String(body?.slug||"").trim().toLowerCase();
    const passwordInput=String(body?.password||"");

    if(!identifier){
      return new Response(JSON.stringify({ok:false,error:"Partita IVA / Codice Fiscale obbligatorio."}),{status:400,headers:cors});
    }

    const admin=createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {auth:{autoRefreshToken:false,persistSession:false}}
    );

    const {data:aziende,error:aziendaError}=await admin
      .from("aziende")
      .select("id,ragione_sociale,nome_app,cf_piva,slug,logo_url,stato")
      .eq("stato","attiva");

    if(aziendaError){
      console.error(aziendaError);
      return new Response(JSON.stringify({ok:false,error:"Errore di verifica della società."}),{status:500,headers:cors});
    }

    const azienda=(aziende||[]).find((a:any)=>{
      const sameIdentifier=norm(a.cf_piva)===identifier;
      const sameSlug=String(a.slug||"").trim().toLowerCase()===slug;
      return sameIdentifier || (!identifier && sameSlug);
    });

    if(!azienda){
      return new Response(JSON.stringify({ok:false,error:"Partita IVA / Codice Fiscale non riconosciuto."}),{status:401,headers:cors});
    }

    const {data:members,error:memberError}=await admin
      .from("azienda_utenti")
      .select("user_id,ruolo,attivo")
      .eq("azienda_id",azienda.id)
      .eq("attivo",true)
      .in("ruolo",["owner","admin","superadmin"])
      .order("ruolo",{ascending:true});

    if(memberError){
      console.error(memberError);
      return new Response(JSON.stringify({ok:false,error:"Impossibile verificare l'utente autorizzato."}),{status:500,headers:cors});
    }

    const member=(members||[]).find((m:any)=>String(m.ruolo).toLowerCase()==="admin") || (members||[]).find((m:any)=>String(m.ruolo).toLowerCase()==="superadmin") || (members||[]).find((m:any)=>String(m.ruolo).toLowerCase()==="owner") || (members||[])[0];
    if(!member?.user_id){
      return new Response(JSON.stringify({ok:false,error:"Nessun account autorizzato associato alla società."}),{status:403,headers:cors});
    }

    const {data:userData,error:userError}=await admin.auth.admin.getUserById(member.user_id);
    const email=String(userData?.user?.email||"").trim();

    if(userError || !email){
      console.error(userError);
      return new Response(JSON.stringify({ok:false,error:"Account amministratore non disponibile."}),{status:403,headers:cors});
    }

    return new Response(JSON.stringify({
      ok:true,
      azienda:{
        id:azienda.id,
        ragione_sociale:azienda.ragione_sociale,
        nome_app:azienda.nome_app,
        cf_piva:azienda.cf_piva,
        slug:azienda.slug,
        logo_url:azienda.logo_url
      },
      role:String(member.ruolo||"").toLowerCase()
    }),{status:200,headers:cors});
  }catch(e){
    console.error(e);
    return new Response(JSON.stringify({ok:false,error:"Errore di collegamento. Riprova."}),{status:500,headers:cors});
  }
});