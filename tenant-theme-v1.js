(()=>{
'use strict';
const SUPABASE_URL='https://dkeqicstprvvfebiaooc.supabase.co';
const ENDPOINT=SUPABASE_URL+'/functions/v1/public-company-legal';
function apply(a){
 if(!a)return;
 const colors=a.colori||a.colori||{};
 const primary=colors.primary||colors.primaryColor||colors.principale||'#073b72';
 const accent=colors.accent||colors.accentColor||colors.accento||'#ffe76b';
 document.documentElement.style.setProperty('--tenant-primary',primary);
 document.documentElement.style.setProperty('--tenant-accent',accent);
 document.documentElement.dataset.tenantTheme='1';
 if(a.sfondo_url) document.body.style.setProperty('background-image',`linear-gradient(rgba(3,12,24,.30),rgba(3,12,24,.68)),url("${a.sfondo_url}")`);
 document.querySelectorAll('[data-tenant-logo]').forEach(el=>{if(a.logo_url)el.src=a.logo_url;});
 document.querySelectorAll('[data-tenant-name]').forEach(el=>{el.textContent=a.nome_app||a.ragione_sociale||el.textContent;});
 document.querySelectorAll('[data-tenant-primary]').forEach(el=>{el.style.backgroundColor=primary;});
 document.querySelectorAll('[data-tenant-accent]').forEach(el=>{el.style.color=accent;});
}
async function load(){
 try{
  const p=new URLSearchParams(location.search);
  const slug=(p.get('azienda')||'').trim();
  const torneo=(p.get('torneo')||p.get('idTorneo')||'').trim();
  let url=ENDPOINT+(slug?'?slug='+encodeURIComponent(slug):torneo?'?torneo='+encodeURIComponent(torneo):'');
  if(!slug&&!torneo){
    const sb=window.supabaseClient||window.sb;
    if(sb){const r=await sb.rpc('get_my_azienda_access');const row=Array.isArray(r.data)?r.data[0]:r.data;if(row?.slug)url=ENDPOINT+'?slug='+encodeURIComponent(row.slug);}
  }
  if(!url.endsWith('legal')){const r=await fetch(url);if(r.ok){const j=await r.json();apply(j.azienda);}}
 }catch(e){console.warn('Tema società non disponibile:',e)}
}
window.tenantTheme={load,apply};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();