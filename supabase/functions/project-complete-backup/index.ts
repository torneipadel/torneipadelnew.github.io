import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Content-Type":"application/json"
};

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN=Deno.env.get("GITHUB_TOKEN")!;
const REPO="torneipadel/torneipadelnew.github.io";
const SUPERADMIN_EMAIL="giose.rizzi@gmail.com";

const admin=createClient(SUPABASE_URL,SERVICE_KEY);

function json(data:any,status=200){
  return new Response(JSON.stringify(data),{status,headers:cors});
}

async function requireSuperadmin(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token=auth.slice(7);
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user) throw new Error("Unauthorized");
  if(String(data.user.email||"").toLowerCase()!==SUPERADMIN_EMAIL) throw new Error("Operazione riservata al Superadmin");
  const {data:assurance,error:assuranceError}=await admin.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if(assuranceError||assurance?.currentLevel!=="aal2") throw new Error("Verifica MFA richiesta per le operazioni Superadmin");
  return data.user;
}

async function github(path:string,init:RequestInit={}){
  if(!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN non configurato nella funzione Supabase");
  const r=await fetch("https://api.github.com"+path,{
    ...init,
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":"Bearer "+GITHUB_TOKEN,
      "X-GitHub-Api-Version":"2026-03-10",
      ...(init.headers||{})
    }
  });
  const text=await r.text();
  let body:any={};
  try{body=text?JSON.parse(text):{};}catch{body={raw:text};}
  if(!r.ok) throw new Error("GitHub HTTP "+r.status+": "+String(body.message||text||"errore"));
  return body;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    const user=await requireSuperadmin(req);

    if(req.method==="GET"){
      const {data,error}=await admin.from("project_complete_backup_registry")
        .select("id,branch_name,commit_sha,created_at,created_by_email,status")
        .order("created_at",{ascending:false})
        .limit(100);
      if(error) throw error;
      return json({ok:true,backups:data||[]});
    }

    if(req.method!=="POST") return json({error:"Method not allowed"},405);

    const main=await github("/repos/"+REPO+"/git/ref/heads/main");
    const sha=main?.object?.sha;
    if(!sha) throw new Error("Commit main non disponibile");

    const now=new Date();
    const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z").replace("T","-").replace("Z","");
    let branch="backup-completo-"+stamp;
    const created=await github("/repos/"+REPO+"/git/refs",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ref:"refs/heads/"+branch,sha})
    });

    const {data,error}=await admin.from("project_complete_backup_registry").insert({
      branch_name:branch,
      commit_sha:sha,
      created_by_email:user.email||null,
      status:"CREATED"
    }).select("id,branch_name,commit_sha,created_at,created_by_email,status").single();
    if(error) throw error;

    return json({
      ok:true,
      backup:data,
      github_url:"https://github.com/"+REPO+"/tree/"+encodeURIComponent(branch),
      commit_url:"https://github.com/"+REPO+"/commit/"+sha,
      github_ref:created?.ref||null
    },201);
  }catch(e){
    const msg=String(e?.message||e);
    console.error("project-complete-backup error:",msg);
    const status=msg==="Unauthorized"?401:(msg.includes("riservata")?403:500);
    return json({ok:false,error:msg},status);
  }
});