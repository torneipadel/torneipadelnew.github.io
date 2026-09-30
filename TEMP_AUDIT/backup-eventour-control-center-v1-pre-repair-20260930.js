(function(){
'use strict';
const SUPA='https://dkeqicstprvvfebiaooc.supabase.co';
const sb=window.sb||window.supabaseClient||window.supabase?.createClient?.(SUPA,'');
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(v||0));
const pct=(v,m)=>m?Math.min(100,Math.round(Number(v||0)/Number(m)*100)):0;
const bar=(v,m)=>{const p=pct(v,m);return '<div class="bar"><i style="width:'+p+'%"></i></div><small>'+p+'%</small>'};
async function auth(){
 if(!sb) throw new Error('Supabase non disponibile');
 const {data:{user}}=await sb.auth.getUser();
 if(!user) throw new Error('Sessione non autenticata');
 const {data:isSuper,error}=await sb.rpc('is_superadmin');
 if(error||isSuper!==true) throw new Error('Accesso riservato al Superadmin');
 return user;
}
async function count(table,col){
 const r=await sb.from(table).select(col?col:'id',{count:'exact',head:true});
 return r.error?0:(r.count||0);
}
async function load(){
 try{
  const user=await auth();
  const [companies,plans,assignments,tornei,users,news,sponsor,mercatino]=await Promise.all([
    sb.from('aziende').select('id,ragione_sociale,nome_app,slug,stato,created_at,demo_scadenza').order('ragione_sociale'),
    sb.from('eventour_plans').select('*').order('code'),
    sb.from('eventour_company_plans').select('azienda_id,plan_code,starts_at,expires_at,status'),
    sb.from('tornei').select('id,azienda_id,stato,nome'),
    sb.from('azienda_utenti').select('azienda_id,user_id,ruolo,attivo'),
    sb.from('news').select('id,azienda_id'),
    sb.from('sponsor').select('id,azienda_id'),
    sb.from('mercatino').select('id,azienda_id')
  ]);
  for(const r of [companies,plans,assignments,tornei,users,news,sponsor,mercatino]) if(r.error) throw r.error;
  const cs=companies.data||[], ps=plans.data||[], as=assignments.data||[], ts=tornei.data||[], us=users.data||[], ns=news.data||[], ss=sponsor.data||[], ms=mercatino.data||[];
  const pmap=Object.fromEntries(ps.map(p=>[p.code,p])), amap=Object.fromEntries(as.map(a=>[a.azienda_id,a]));
  const stats=cs.map(c=>{
    const a=amap[c.id]||{plan_code:'START',status:'active'};
    const p=pmap[a.plan_code]||pmap.START;
    const usersN=us.filter(x=>x.azienda_id===c.id&&x.attivo!==false).length;
    const admins=us.filter(x=>x.azienda_id===c.id&&x.attivo!==false&&['owner','admin','superadmin'].includes(String(x.ruolo).toLowerCase())).length;
    const activeT=ts.filter(x=>x.azienda_id===c.id&&!['chiuso','archiviato','annullato'].includes(String(x.stato||'').toLowerCase())).length;
    const newsN=ns.filter(x=>x.azienda_id===c.id).length, photoN=ss.filter(x=>x.azienda_id===c.id).length+ms.filter(x=>x.azienda_id===c.id).length+ns.filter(x=>x.azienda_id===c.id).length;
    return {...c,plan:a.plan_code,planCfg:p,planStatus:a.status,expires:a.expires_at,usersN,admins,activeT,newsN,photoN};
  });
  const byPlan=Object.fromEntries(ps.map(p=>[p.code,stats.filter(c=>c.plan===p.code).length]));
  const priced=ps.filter(p=>Number(p.monthly_price)>0);
  const mrr=priced.reduce((s,p)=>s+byPlan[p.code]*Number(p.monthly_price),0);
  const totalUsers=us.filter(x=>x.attivo!==false).length;
  const totalT=ts.length,totalNews=ns.length;
  $('app').innerHTML='<section class="hero-grid">'+
   '<div class="hero-card"><span>Società</span><b>'+cs.length+'</b><small>tenant attivi/configurazione</small></div>'+
   '<div class="hero-card"><span>START</span><b>'+byPlan.START+'</b><small>piano</small></div>'+
   '<div class="hero-card"><span>PRO</span><b>'+byPlan.PRO+'</b><small>piano</small></div>'+
   '<div class="hero-card"><span>BUSINESS</span><b>'+byPlan.BUSINESS+'</b><small>piano</small></div>'+
   '<div class="hero-card"><span>Utenti</span><b>'+totalUsers+'</b><small>membership attive</small></div>'+
   '<div class="hero-card"><span>Tornei</span><b>'+totalT+'</b><small>totali</small></div>'+
   '<div class="hero-card"><span>News</span><b>'+totalNews+'</b><small>contenuti</small></div>'+
   '<div class="hero-card"><span>MRR</span><b>'+ (priced.length?money(mrr):'—')+'</b><small>'+ (priced.length?'prezzi configurati':'prezzi piano da configurare')+'</small></div>'+
  '</section>'+
  '<section class="panel"><div class="panel-title"><div><h2>Aziende</h2><p>Azienda → Piano → Funzioni → Consumo → Limite → Alert.</p></div><input id="search" placeholder="Cerca società…"></div>'+
  '<div class="table-wrap"><table><thead><tr><th>Società</th><th>Piano</th><th>Stato</th><th>Scadenza</th><th>Utenti/Admin</th><th>Tornei</th><th>News/Contenuti</th><th>Limiti</th><th>Alert</th></tr></thead><tbody>'+
  stats.map(c=>{
   const p=c.planCfg||{}, tAlert=c.activeT>=p.max_active_tournaments?'BLOCCO':c.activeT/p.max_active_tournaments>=.9?'90%+':c.activeT/p.max_active_tournaments>=.8?'80%+':c.activeT/p.max_active_tournaments>=.7?'70%+':'OK';
   const aCls=tAlert==='BLOCCO'?'danger':tAlert==='OK'?'ok':'warn';
   return '<tr><td><b>'+esc(c.ragione_sociale||c.nome_app||c.slug)+'</b><small>'+esc(c.slug||'')+'</small></td><td><span class="plan '+esc(c.plan)+'">'+esc(c.plan)+'</span></td><td>'+esc(c.stato||'-')+'</td><td>'+esc(c.expires?new Date(c.expires).toLocaleDateString('it-IT'):'—')+'</td><td>'+c.usersN+' / '+c.admins+'<small>max '+(p.max_admins??'—')+'</small></td><td>'+c.activeT+' / '+(p.max_active_tournaments??'—')+'</td><td>'+c.newsN+' / '+(p.max_news??'—')+'<small>contenuti rilevati '+c.photoN+'</small></td><td><div>Storage <b>n/d</b></div><div>Foto/cont. '+bar(c.photoN,p.max_photos)+'</div></td><td><span class="alert '+aCls+'">'+aCls+'</span></td></tr>';
  }).join('')+'</tbody></table></div></section>'+
  '<section class="grid2"><div class="panel"><div class="panel-title"><div><h2>Piani e permessi</h2><p>Un solo motore EVENTOUR: il piano governa funzioni e limiti.</p></div></div><div class="plan-grid">'+ps.map(p=>'<article class="plan-card"><h3>'+esc(p.name)+'</h3><div class="big">'+(Number(p.monthly_price)>0?money(p.monthly_price):'Prezzo da configurare')+'</div><ul><li>Storage: '+p.storage_mb+' MB</li><li>Foto: '+p.max_photos+'</li><li>News: '+p.max_news+'</li><li>Tornei attivi: '+p.max_active_tournaments+'</li><li>Admin: '+p.max_admins+'</li><li>Statistiche: '+(p.stats_advanced?'avanzate':'base')</li><li>Automazioni: '+esc(p.automations_level)+'</li><li>Personalizzazione: '+esc(p.customization_level)+'</li><li>Report/export: '+esc(p.reports_level)+'</li><li>Premium: '+esc(p.premium_level)+'</li></ul></article>').join('')+'</div></div>'+
  '<div class="panel"><div class="panel-title"><div><h2>Risorse piattaforma</h2><p>Monitoraggio applicativo corrente.</p></div></div><div class="resource-list"><div><b>Supabase</b><span>'+cs.length+' aziende · '+totalUsers+' utenti · '+totalT+' tornei</span></div><div><b>GitHub</b><span>Repository unico EVENTOUR · versioni gestite dal Control Center</span></div><div><b>Aruba</b><span>Provider esterno: consumo/costo non esposto dal repository</span></div><div><b>Storage</b><span>Telemetry per byte da collegare quando disponibile</span></div></div></div></section>'+
  '<section class="panel"><div class="panel-title"><div><h2>Regole operative</h2><p>Soglie di controllo: 70% / 80% / 90% / 100%.</p></div></div><div class="rules"><span>🟢 &lt; 70% normale</span><span>🟡 ≥ 70% attenzione</span><span>🟠 ≥ 80% alta attenzione</span><span>🔴 ≥ 90% quasi limite</span><span>⛔ 100% blocco</span></div></section>';
  $('search').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.innerText.toLowerCase().includes(q)?'':'none')};
 }catch(e){$('app').innerHTML='<div class="error">❌ '+esc(e.message||e)+'</div>'}
}
$('refreshBtn').onclick=load;$('backBtn').onclick=()=>location.href='admin.html';load();
})();