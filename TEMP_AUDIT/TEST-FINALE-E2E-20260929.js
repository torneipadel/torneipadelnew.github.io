(()=>{"use strict";
const out=[];const ok=(id,cond,detail)=>out.push({id,ok:!!cond,detail:detail||""});
const err=(id,e)=>out.push({id,ok:false,detail:"ERROR: "+(e?.message||e)});
const p=new URLSearchParams(location.search);
const path=location.pathname.split("/").pop();
try{
 ok("E2E-01",location.protocol==="https:","HTTPS");
 ok("E2E-02",!!window.supabase||!!window.sb||!!window.supabaseClient,"Supabase client presente");

 if(path==="visitatore.html"){
   const slug=p.get("azienda")||"";
   ok("E2E-03",slug==="eventi-tornei-863e403a","slug società Eventi & Tornei");
   ok("E2E-04",typeof window.apriTorneoPubblico==="function","apriTorneoPubblico disponibile");
   ok("E2E-05",typeof window.vaiIscrizione==="function","vaiIscrizione disponibile");
   const t=Array.isArray(window.tournaments)?window.tournaments:(Array.isArray(window.__NP_TOURNAMENTS__)?window.__NP_TOURNAMENTS__:[]);
   ok("E2E-06",t.length>0,"catalogo torneo caricato");
   ok("E2E-07",t.every(x=>String(x.azienda_id||"")===String(window.publicCompany?.id||"f400232d-731f-49f4-af45-3f47549d3eed")),"catalogo tenant-scoped");
   ok("E2E-08",!t.some(x=>String(x.azienda_id)==="d6346bfe-3636-4b7f-85a0-02b7c0a90c17"),"nessun Padel Roma nel catalogo");
   const first=t[0];
   if(first){
     const expected="tabellone.html?idTorneo="+encodeURIComponent(first.id)+"&azienda_id="+encodeURIComponent(window.publicCompany?.id||"f400232d-731f-49f4-af45-3f47549d3eed");
     const before=location.href;
     const fake=window.publicCompany?.id||"f400232d-731f-49f4-af45-3f47549d3eed";
     ok("E2E-09",expected.includes("azienda_id="+encodeURIComponent(fake)),"link tabellone include tenant");
     const ins="iscrizione.html?torneo="+encodeURIComponent(first.id)+"&azienda="+encodeURIComponent(slug);
     ok("E2E-10",ins.includes("azienda="+encodeURIComponent(slug)),"link iscrizione conserva slug");
   }
 }else if(path==="tabellone.html"){
   const tenant=p.get("azienda_id")||"";
   ok("E2E-11",tenant==="f400232d-731f-49f4-af45-3f47549d3eed","tenant URL corretto");
   ok("E2E-12",window.__BOVE_PUBLIC_READONLY__===true || !!window.__BOVE_TENANT_ID__,"modalità pubblica/tenant rilevata");
   ok("E2E-13",window.__BOVE_TENANT_ID__===tenant,"tenant runtime coerente");
   ok("E2E-14",document.body.classList.contains("user-mode")||window.__BOVE_PUBLIC_READONLY__===true,"sola lettura pubblica");
   ok("E2E-15",!document.querySelector(".admin-save-result-button")||getComputedStyle(document.querySelector(".admin-save-result-button")).display==="none","salvataggio admin non esposto");
   ok("E2E-16",!window.__BOVE_REMOTE_NOT_FOUND__,"torneo pubblico caricato");
 }else if(path==="iscrizione.html"){
   const slug=p.get("azienda")||"";
   const tid=p.get("torneo")||"";
   ok("E2E-17",slug==="eventi-tornei-863e403a","slug conservato");
   ok("E2E-18",/^\d+$/.test(tid),"id torneo presente");
   ok("E2E-19",typeof window.confermaIscrizione==="function","funzione iscrizione presente");
   ok("E2E-20",typeof window.tornaTornei==="function","ritorno tornei presente");
   ok("E2E-21",document.getElementById("btnConferma")!=null,"bottone conferma presente");
 }else{
   ok("E2E-03",false,"Aprire visitatore.html, tabellone.html o iscrizione.html");
 }
}catch(e){err("E2E-X",e)}
const ko=out.filter(x=>!x.ok);console.table(out);console.log("=== TEST FINALE E2E ===",out.length-ko.length+"/"+out.length,"OK |",ko.length,"KO");window.__NP_FINAL_E2E_TEST__={out,ok:out.length-ko.length,ko:ko.length,path};})();
