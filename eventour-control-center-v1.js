(() => {
'use strict';
const URL='https://dkeqicstprvvfebiaooc.supabase.co';
const KEY='sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>v?new Date(v).toLocaleDateString('it-IT'):'—';
const fmtMoney=v=>Number(v||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const dtLocal=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
let sb,data={companies:[],plans:[],members:[],audit:[],codeVersions:[],restoreRequests:[],projectBackups:[]},busy=false;
const app=()=>document.getElementById('app');
function fail(message){const a=app();if(a)a.innerHTML='<div class="error">❌ '+esc(message)+'</div>'}
function note(message,type='ok'){const el=document.getElementById('notice');if(el){el.className='notice '+type;el.textContent=message;el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'nearest'})}}
function numOrNull(v){return v===''||v==null?null:Number(v)}
async function rpc(name,args){const {data:result,error}=await sb.rpc(name,args);if(error)throw error;return result}
async function load(){
 if(busy)return;busy=true;
 try{
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError)throw authError;if(!user)throw new Error('Sessione Superadmin non autenticata. Accedi nuovamente.');
  const {data:role,error:roleError}=await sb.rpc('is_superadmin');
  if(roleError)throw roleError;if(role!==true)throw new Error('Accesso riservato al Superadmin globale.');
  const result=await rpc('eventour_superadmin_overview',{});
  data={companies:Array.isArray(result?.companies)?result.companies:[],plans:Array.isArray(result?.plans)?result.plans:[],members:Array.isArray(result?.members)?result.members:[],audit:Array.isArray(result?.audit)?result.audit:[],codeVersions:Array.isArray(result?.code_versions)?result.code_versions:[],restoreRequests:Array.isArray(result?.restore_requests)?result.restore_requests:[],projectBackups:Array.isArray(result?.project_backups)?result.project_backups:[]};
  render(); await Promise.all([loadCodeHistory(),loadProjectBackups()]);
 }catch(e){fail(e?.message||String(e))}
 finally{busy=false}
}
function statusPill(status){const s=String(status||'—');const cls=['attiva','active'].includes(s.toLowerCase())?'ok':['sospesa','suspended','expired'].includes(s.toLowerCase())?'danger':'warn';return '<span class="pill '+cls+'">'+esc(s)+'</span>'}
function render(){
 const companies=data.companies,plans=data.plans,members=data.members,audit=data.audit;
 const countPlan=code=>companies.filter(c=>c.plan===code).length;
 const totalUsers=companies.reduce((s,c)=>s+Number(c.users||0),0),totalTournaments=companies.reduce((s,c)=>s+Number(c.activeTournaments||0),0);
 app().innerHTML=`
 <div id="notice" class="notice" hidden></div>
 <section class="hero-grid">
  <div class="hero-card"><span>Società</span><b>${companies.length}</b><small>tenant registrati</small></div>
  <div class="hero-card"><span>START</span><b>${countPlan('START')}</b><small>società assegnate</small></div>
  <div class="hero-card"><span>PRO</span><b>${countPlan('PRO')}</b><small>società assegnate</small></div>
  <div class="hero-card"><span>BUSINESS</span><b>${countPlan('BUSINESS')}</b><small>società assegnate</small></div>
  <div class="hero-card"><span>Utenti</span><b>${totalUsers}</b><small>membri società attivi</small></div>
  <div class="hero-card"><span>Tornei</span><b>${totalTournaments}</b><small>non chiusi / archiviati</small></div>
  <div class="hero-card"><span>Piani</span><b>${plans.length}</b><small>catalogo commerciale</small></div>
  <div class="hero-card"><span>Audit</span><b>${audit.length}</b><small>ultime 50 operazioni</small></div>
 </section>
 <section class="panel">
  <div class="panel-title"><div><h2>Gestione società</h2><p>Modifica dati, stato, piano e accessi senza mescolare i dati operativi dei tenant.</p></div><div class="toolbar"><input id="companySearch" placeholder="Cerca società, slug o piano…"><button class="primary" data-action="new-company">＋ Nuova società</button></div></div>
  <div class="table-wrap"><table id="companiesTable"><thead><tr><th>Società</th><th>Stato</th><th>Piano</th><th>Scadenza</th><th>Utenti / Admin</th><th>Tornei</th><th>Contenuti</th><th>Azioni</th></tr></thead><tbody>
  ${companies.map(c=>`<tr data-search="${esc([c.ragione_sociale,c.nome_app,c.slug,c.plan,c.stato].join(' ').toLowerCase())}">
   <td><b>${esc(c.ragione_sociale||c.nome_app||c.slug)}</b><small>${esc(c.slug||'')}</small><small>Creata: ${fmtDate(c.created_at)}</small></td>
   <td>${statusPill(c.stato)}</td><td>${esc(c.plan||'Nessun piano')}<small>${statusPill(c.status)}</small></td>
   <td>${fmtDate(c.expires)}<small>Demo: ${fmtDate(c.demo_scadenza)}</small></td>
   <td>${Number(c.users||0)} / ${Number(c.admins||0)}</td><td>${Number(c.activeTournaments||0)} / ${c.plan_config?.max_active_tournaments??'∞'}</td>
   <td>News: ${Number(c.news||0)}<small>Sponsor: ${Number(c.sponsors||0)} · Mercatino: ${Number(c.marketItems||0)}</small></td>
   <td><div class="action-stack"><button data-action="edit-company" data-id="${esc(c.id)}">Modifica</button><button data-action="edit-company-plan" data-id="${esc(c.id)}">Piano</button><button data-action="company-members" data-id="${esc(c.id)}">Utenti</button></div></td>
  </tr>`).join('')||'<tr><td colspan="8">Nessuna società registrata.</td></tr>'}
  </tbody></table></div>
 </section>
 <section class="panel">
  <div class="panel-title"><div><h2>Catalogo piani e limiti</h2><p>Modifica prezzi, storage, limiti e livelli delle funzionalità.</p></div><button class="primary" data-action="new-plan">＋ Nuovo piano</button></div>
  <div class="plan-grid">${plans.map(p=>`<article class="plan-card"><div class="plan-card-head"><h3>${esc(p.name)}</h3><span class="code-tag">${esc(p.code)}</span></div><div class="big">${fmtMoney(p.monthly_price)} <small>/ mese</small></div>
   <ul><li>Storage: ${Number(p.storage_mb||0)} MB</li><li>Foto: ${p.max_photos??'Senza limite'}</li><li>News: ${p.max_news??'Senza limite'}</li><li>Tornei attivi: ${p.max_active_tournaments??'Senza limite'}</li><li>Admin: ${p.max_admins??'Senza limite'}</li><li>Statistiche: ${p.stats_advanced?'avanzate':'base'}</li><li>Automazioni: ${esc(p.automations_level)}</li><li>Personalizzazione: ${esc(p.customization_level)}</li><li>Report: ${esc(p.reports_level)}</li><li>Premium: ${esc(p.premium_level)}</li></ul><button data-action="edit-plan" data-code="${esc(p.code)}">Modifica piano</button>
  </article>`).join('')||'<p>Nessun piano configurato.</p>'}</div>
 </section>
 <section class="panel">
  <div class="panel-title"><div><h2>Utenti e accessi delle società</h2><p>Gestione ruolo e attivazione del singolo utente all’interno della sola società selezionata.</p></div><input id="memberSearch" placeholder="Cerca email o società…"></div>
  <div class="table-wrap"><table id="membersTable"><thead><tr><th>Società</th><th>Email</th><th>Ruolo società</th><th>Accesso attivo</th><th>Azioni</th></tr></thead><tbody>
  ${members.map(m=>`<tr data-search="${esc([m.azienda,m.email,m.role].join(' ').toLowerCase())}"><td>${esc(m.azienda)}</td><td>${esc(m.email||m.user_id)}</td><td><select data-role-for="${esc(m.azienda_id+':'+m.user_id)}"><option value="owner" ${m.role==='owner'?'selected':''}>Proprietario</option><option value="admin" ${m.role==='admin'?'selected':''}>Amministratore</option><option value="user" ${m.role==='user'?'selected':''}>Utente</option></select></td><td><input type="checkbox" data-active-for="${esc(m.azienda_id+':'+m.user_id)}" ${m.active?'checked':''}></td><td><button data-action="save-member" data-company="${esc(m.azienda_id)}" data-user="${esc(m.user_id)}">Salva accesso</button></td></tr>`).join('')||'<tr><td colspan="5">Nessun utente associato a società.</td></tr>'}
  </tbody></table></div>
 </section>
 <section class="panel"><div class="panel-title"><div><h2>Registro attività Superadmin</h2><p>Ultime 50 operazioni amministrative registrate.</p></div></div>
 <div class="table-wrap"><table><thead><tr><th>Data</th><th>Operatore</th><th>Azione</th><th>Oggetto</th><th>Dettaglio</th></tr></thead><tbody>
 ${audit.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('it-IT')}</td><td>${esc(a.email||'—')}</td><td><code>${esc(a.action)}</code></td><td>${esc(a.entity_type||'')} ${esc(a.entity_id||'')}</td><td>${esc(a.summary||'')}</td></tr>`).join('')||'<tr><td colspan="5">Nessuna operazione registrata finora.</td></tr>'}
 </tbody></table></div></section>
 <section class="panel">
  <div class="panel-title"><div><h2>Backup e ripristino globale</h2><p>Snapshot completo del repository, cronologia dei file del Superadmin e ripristino controllato da commit.</p></div><div class="toolbar"><button class="primary" data-action="create-project-backup">💾 Backup completo adesso</button><button data-action="refresh-code-backups">↻ Aggiorna backup</button></div></div>
  <div id="projectBackupStatus" class="notice" hidden></div>
  <h3>Backup completi del repository</h3><div id="projectBackupHistory" class="backup-history"><div class="loading">Lettura backup completi…</div></div>
  <h3>Versioni codice Superadmin</h3><p class="section-help">Apri o confronta il commit prima di marcare una versione o richiedere un ripristino. Il ripristino crea un nuovo commit e conserva la cronologia.</p>
  <div id="codeVersions" class="code-version-list"><div class="loading">Lettura cronologia GitHub…</div></div>
  <h3>Richieste di ripristino codice</h3><div class="table-wrap"><table><thead><tr><th>Data richiesta</th><th>File</th><th>Commit</th><th>Stato</th><th>Risultato</th></tr></thead><tbody>
  ${data.restoreRequests.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString('it-IT')}</td><td>${esc(r.file_path)}</td><td><a href="https://github.com/torneipadel/torneipadelnew.github.io/commit/${esc(r.commit_sha)}" target="_blank" rel="noopener">${esc(String(r.commit_sha||'').slice(0,10))}</a></td><td>${statusPill(r.status)}</td><td>${esc(r.result||'In attesa dell’elaborazione GitHub Actions')}</td></tr>`).join('')||'<tr><td colspan="5">Nessuna richiesta di ripristino registrata.</td></tr>'}
  </tbody></table></div>
 </section>
 <section class="grid2"><div class="panel"><div class="panel-title"><div><h2>Risorse piattaforma</h2><p>Stato reale delle integrazioni, senza inventare telemetria.</p></div></div><div class="resource-list">
 <div><b>Supabase</b><span>${companies.length} società · ${totalUsers} utenti · ${totalTournaments} tornei conteggiati</span></div>
 <div><b>GitHub Pages</b><span>Repository unico EVENTOUR · distribuzione statica</span></div>
 <div><b>Aruba</b><span>Monitoraggio automatico non collegato</span></div>
 <div><b>Storage</b><span>Misurazione in byte non collegata; i limiti configurati non sono consumo reale</span></div>
 </div></div><div class="panel"><div class="panel-title"><div><h2>Regole di sicurezza</h2><p>Operazioni protette da RPC server-side.</p></div></div><div class="rules"><span>Solo Superadmin autenticato</span><span>Audit delle modifiche</span><span>Ruoli limitati alla singola società</span><span>Nessuna eliminazione massiva</span></div></div></section>
 <div id="modalHost"></div>`;
 document.getElementById('companySearch').addEventListener('input',e=>filterRows('companiesTable',e.target.value));
 document.getElementById('memberSearch').addEventListener('input',e=>filterRows('membersTable',e.target.value));
}
function filterRows(id,q){const needle=q.toLowerCase();document.querySelectorAll('#'+id+' tbody tr[data-search]').forEach(tr=>tr.hidden=!tr.dataset.search.includes(needle))}
function modal(title,body){const host=document.getElementById('modalHost');host.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" data-action="close-modal" aria-label="Chiudi">✕</button></div><div class="modal-body">${body}</div></section></div>`;host.querySelector('.modal').addEventListener('click',e=>e.stopPropagation())}
function field(label,id,value='',type='text',extra=''){return `<label class="field"><span>${esc(label)}</span><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function limitField(label,id,value){return field(label,id,value??'','number','min="0" placeholder="Vuoto = senza limite"')}
function companyById(id){return data.companies.find(c=>c.id===id)}
function planByCode(code){return data.plans.find(p=>p.code===code)}
function companyForm(c){
 const isNew=!c;
 const existingFields=isNew?'':`<label class="field"><span>Stato società</span><select id="companyStatus"><option value="configurazione" ${c.stato==='configurazione'?'selected':''}>Configurazione</option><option value="attiva" ${c.stato==='attiva'?'selected':''}>Attiva</option><option value="sospesa" ${c.stato==='sospesa'?'selected':''}>Sospesa</option></select></label>${field('Scadenza demo (opzionale)','demoExpiry',dtLocal(c.demo_scadenza),'datetime-local')}`;
 modal(isNew?'Crea società':'Modifica società',`<form id="companyForm" class="form-grid">
 ${isNew?field('Email proprietario già registrato','ownerEmail','','email','required'):''}
 ${field('Ragione sociale','companyName',c?.ragione_sociale||'','text','required')}
 ${field('Nome app / club','appName',c?.nome_app||'','text','required')}
 ${field('Slug URL (univoco)','slug',c?.slug||'','text','required pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?"')}
 ${existingFields}
 ${isNew?'<p class="form-help full">L’utente proprietario deve già avere un account. La nuova società nasce in stato “Configurazione”; poi assegna un piano e attivala dopo aver verificato i dati.</p>':''}
 <div class="form-actions"><button type="button" data-action="close-modal">Annulla</button><button class="primary" type="submit">${isNew?'Crea società':'Salva modifiche'}</button></div></form>`);
 document.getElementById('companyForm').addEventListener('submit',async e=>{e.preventDefault();await action(async()=>{
  if(isNew){const result=await rpc('eventour_superadmin_create_company',{p_owner_email:document.getElementById('ownerEmail').value.trim(),p_ragione_sociale:document.getElementById('companyName').value.trim(),p_nome_app:document.getElementById('appName').value.trim(),p_slug:document.getElementById('slug').value.trim().toLowerCase()});return 'Società creata in configurazione. ID: '+result.id+'. Assegna il piano e attivala quando pronta.'}
  await rpc('eventour_superadmin_update_company',{p_azienda_id:c.id,p_ragione_sociale:document.getElementById('companyName').value.trim(),p_nome_app:document.getElementById('appName').value.trim(),p_slug:document.getElementById('slug').value.trim().toLowerCase(),p_stato:document.getElementById('companyStatus').value,p_demo_scadenza:document.getElementById('demoExpiry').value?new Date(document.getElementById('demoExpiry').value).toISOString():null});return 'Dati società aggiornati.'
 },true)});
}
function companyPlanForm(c){
 const p=planByCode(c.plan)||data.plans[0];
 modal('Piano società · '+(c.ragione_sociale||c.nome_app),`<form id="companyPlanForm" class="form-grid">
 <label class="field"><span>Piano</span><select id="planCode">${data.plans.map(x=>`<option value="${esc(x.code)}" ${x.code===p?.code?'selected':''}>${esc(x.code)} — ${esc(x.name)}</option>`).join('')}</select></label>
 <label class="field"><span>Stato abbonamento</span><select id="planStatus"><option value="active" ${c.status==='active'?'selected':''}>Attivo</option><option value="suspended" ${c.status==='suspended'?'selected':''}>Sospeso</option><option value="expired" ${c.status==='expired'?'selected':''}>Scaduto</option></select></label>
 ${field('Scadenza piano (vuota = nessuna)','planExpiry',dtLocal(c.expires),'datetime-local')}
 <label class="field full"><span>Note amministrative</span><textarea id="planNotes" rows="3" placeholder="Motivo, accordo commerciale, riferimento…">${esc(c.plan_notes||String())}</textarea></label>
 <div class="form-actions"><button type="button" data-action="close-modal">Annulla</button><button class="primary" type="submit">Salva piano</button></div></form>`);
 document.getElementById('companyPlanForm').addEventListener('submit',async e=>{e.preventDefault();await action(async()=>{await rpc('eventour_superadmin_set_company_plan',{p_azienda_id:c.id,p_plan_code:document.getElementById('planCode').value,p_status:document.getElementById('planStatus').value,p_expires_at:document.getElementById('planExpiry').value?new Date(document.getElementById('planExpiry').value).toISOString():null,p_notes:document.getElementById('planNotes').value.trim()});return 'Piano società aggiornato.'},true)});
}
function planForm(p){
 const isNew=!p;
 modal(isNew?'Crea piano':'Modifica piano '+p.code,`<form id="planForm" class="form-grid">
 ${field('Codice (es. START)','planCode',p?.code||'','text',isNew?'required pattern="[A-Za-z][A-Za-z0-9_-]{1,29}"':'required disabled')}
 ${field('Nome piano','planName',p?.name||'','text','required')}
 ${field('Prezzo mensile (€)','planPrice',p?.monthly_price??0,'number','required min="0" step="0.01"')}
 ${field('Storage (MB)','planStorage',p?.storage_mb??100,'number','required min="0"')}
 ${limitField('Limite foto','planPhotos',p?.max_photos)}${limitField('Limite news','planNews',p?.max_news)}
 ${limitField('Tornei attivi massimi','planTournaments',p?.max_active_tournaments)}${limitField('Admin massimi','planAdmins',p?.max_admins)}
 <label class="field"><span>Statistiche avanzate</span><select id="planStats"><option value="false" ${!p?.stats_advanced?'selected':''}>No</option><option value="true" ${p?.stats_advanced?'selected':''}>Sì</option></select></label>
 ${field('Livello automazioni','planAutomations',p?.automations_level||'base')}
 ${field('Livello personalizzazione','planCustomization',p?.customization_level||'base')}
 ${field('Livello report','planReports',p?.reports_level||'base')}
 ${field('Livello premium','planPremium',p?.premium_level||'none')}
 <div class="form-actions"><button type="button" data-action="close-modal">Annulla</button><button class="primary" type="submit">Salva piano</button></div></form>`);
 document.getElementById('planForm').addEventListener('submit',async e=>{e.preventDefault();await action(async()=>{await rpc('eventour_superadmin_save_plan',{p_code:document.getElementById('planCode').value.trim().toUpperCase(),p_name:document.getElementById('planName').value.trim(),p_monthly_price:Number(document.getElementById('planPrice').value),p_storage_mb:Number(document.getElementById('planStorage').value),p_max_photos:numOrNull(document.getElementById('planPhotos').value),p_max_news:numOrNull(document.getElementById('planNews').value),p_max_active_tournaments:numOrNull(document.getElementById('planTournaments').value),p_max_admins:numOrNull(document.getElementById('planAdmins').value),p_stats_advanced:document.getElementById('planStats').value==='true',p_automations_level:document.getElementById('planAutomations').value.trim()||'base',p_customization_level:document.getElementById('planCustomization').value.trim()||'base',p_reports_level:document.getElementById('planReports').value.trim()||'base',p_premium_level:document.getElementById('planPremium').value.trim()||'none'});return 'Piano salvato nel catalogo.'},true)});
}

const CODE_FILES=['eventour-control-center.html','eventour-control-center-v1.js','eventour-control-center-v1.css','superadmin-login.html','eventour-control-center-entry-v1.js','index.html'];
const GITHUB_REPO='torneipadel/torneipadelnew.github.io';
async function loadCodeHistory(){
 const host=document.getElementById('codeVersions');if(!host)return;
 host.innerHTML='<div class="loading">Lettura cronologia GitHub…</div>';
 const registry=new Map(data.codeVersions.map(x=>[x.file_path+'@'+x.commit_sha,x]));
 const groups=await Promise.all(CODE_FILES.map(async file=>{
  try{const response=await fetch('https://api.github.com/repos/'+GITHUB_REPO+'/commits?path='+encodeURIComponent(file)+'&per_page=5',{headers:{Accept:'application/vnd.github+json'}});if(!response.ok)throw new Error('GitHub HTTP '+response.status);const commits=await response.json();return {file,commits,error:null}}
  catch(e){return {file,commits:[],error:e.message||String(e)}}
 }));
 host.innerHTML=groups.map(group=>{
  let html='<article class="code-file-card"><h4>'+esc(group.file)+'</h4>';
  if(group.error)return html+'<p class="empty">Cronologia non disponibile: '+esc(group.error)+'</p></article>';
  if(!group.commits.length)return html+'<p class="empty">Nessun commit trovato.</p></article>';
  html+='<div class="code-commit-list">';
  group.commits.forEach(cm=>{
   const sha=String(cm.sha||'');if(!/^[0-9a-f]{40}$/i.test(sha))return;
   const meta=registry.get(group.file+'@'+sha);const status=meta?.status||'TEST';
   const badge=status==='STABILE'?'🟢 STABILE':status==='PROBLEMATICA'?'🔴 PROBLEMATICA':'🟡 TEST';
   const date=cm.commit?.author?.date||cm.committer?.date;
   const message=cm.commit?.message?.split('\n')[0]||'';
   html+='<div class="code-commit"><div class="code-commit-meta"><b>'+badge+' · '+esc(sha.slice(0,10))+'</b><small>'+esc(date?new Date(date).toLocaleString('it-IT'):'')+' · '+esc(message)+'</small></div><div class="code-commit-actions"><a href="https://github.com/'+GITHUB_REPO+'/commit/'+sha+'" target="_blank" rel="noopener">Apri</a><a href="https://github.com/'+GITHUB_REPO+'/compare/'+sha+'...main" target="_blank" rel="noopener">Confronta</a><button data-action="mark-code-version" data-status="STABILE" data-file="'+esc(group.file)+'" data-sha="'+sha+'">⭐ Stabile</button><button data-action="mark-code-version" data-status="TEST" data-file="'+esc(group.file)+'" data-sha="'+sha+'">🟡 Test</button><button data-action="mark-code-version" data-status="PROBLEMATICA" data-file="'+esc(group.file)+'" data-sha="'+sha+'">🔴 Problematica</button><button class="danger" data-action="request-code-restore" data-file="'+esc(group.file)+'" data-sha="'+sha+'">↩ Ripristina</button></div></div>';
  });
  return html+'</div></article>';
 }).join('');
}
async function loadProjectBackups(){
 const host=document.getElementById('projectBackupHistory');if(!host)return;
 host.innerHTML='<div class="loading">Lettura backup completi…</div>';
 try{
  const {data:result,error}=await sb.functions.invoke('project-complete-backup',{method:'GET'});
  if(error)throw error;if(!result?.ok)throw new Error(result?.error||'Servizio backup non disponibile');
  const rows=Array.isArray(result.backups)?result.backups:[];
  host.innerHTML=rows.length?'<div class="backup-history-list">'+rows.map(b=>'<article class="backup-item"><div><b>'+esc(b.branch_name)+'</b><small>'+esc(b.created_by_email||'—')+' · '+esc(new Date(b.created_at).toLocaleString('it-IT'))+'</small><small>Commit '+esc(String(b.commit_sha||'').slice(0,12))+' · '+esc(b.status||'CREATED')+'</small></div><div><a href="https://github.com/'+GITHUB_REPO+'/tree/'+encodeURIComponent(b.branch_name)+'" target="_blank" rel="noopener">Apri backup</a> · <a href="https://github.com/'+GITHUB_REPO+'/commit/'+encodeURIComponent(b.commit_sha)+'" target="_blank" rel="noopener">Commit origine</a></div></article>').join('')+'</div>':'<p class="empty">Nessun backup completo registrato. Puoi crearne uno con il pulsante qui sopra.</p>';
 }catch(e){host.innerHTML='<p class="empty">Impossibile leggere i backup completi: '+esc(e?.message||String(e))+'</p>'}
}
async function createProjectBackup(){
 const button=document.querySelector('[data-action="create-project-backup"]'),status=document.getElementById('projectBackupStatus');
 if(button){button.disabled=true;button.textContent='Creazione backup…'}if(status){status.hidden=false;status.className='notice';status.textContent='Creazione snapshot completo in corso…'}
 try{
  const {data:result,error}=await sb.functions.invoke('project-complete-backup',{method:'POST',body:{}});
  if(error)throw error;if(!result?.ok)throw new Error(result?.error||'Backup non creato');
  await load();note('Backup completo creato: '+(result.backup?.branch_name||'snapshot GitHub'));
 }catch(e){if(status){status.hidden=false;status.className='notice bad';status.textContent='Backup non creato: '+(e?.message||String(e))}}
 finally{if(button){button.disabled=false;button.textContent='💾 Backup completo adesso'}}
}
async function markCodeVersion(file,sha,status){
 const notes=status==='STABILE'?'Versione approvata dal Superadmin':status==='PROBLEMATICA'?'Versione marcata come problematica':'Versione in test';
 await rpc('eventour_superadmin_mark_code_version',{p_file_path:file,p_commit_sha:sha,p_status:status,p_note:notes});
 await load();note('Versione '+sha.slice(0,10)+' marcata '+status+'.');
}
async function requestCodeRestore(file,sha){
 if(!confirm('ATTENZIONE: il ripristino sostituirà il file con la versione selezionata e creerà un nuovo commit. Potresti annullare correzioni successive. Hai verificato Apri e Confronta? Confermi il ripristino di '+file+' al commit '+sha.slice(0,10)+'?'))return;
 await rpc('superadmin_request_code_restore',{p_file_path:file,p_commit_sha:sha});
 await load();note('Richiesta di ripristino registrata. GitHub Actions la elaborerà automaticamente.');
}

async function action(fn,refresh=false){try{const message=await fn();document.getElementById('modalHost').innerHTML='';if(refresh)await load();note(message||'Operazione completata.')}catch(e){const message=e?.message||String(e);const body=document.querySelector('#modalHost .modal-body');if(body){let box=body.querySelector('.form-error');if(!box){box=document.createElement('div');box.className='form-error';body.prepend(box)}box.textContent=message}else note(message,'bad')}}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action;
 if(a==='close-modal'){if(e.target.classList.contains('modal-backdrop')||e.target.closest('button'))document.getElementById('modalHost').innerHTML='';return}
 if(a==='create-project-backup'){await createProjectBackup();return}
 if(a==='refresh-code-backups'){await load();return}
 if(a==='mark-code-version'){btn.disabled=true;try{await markCodeVersion(btn.dataset.file,btn.dataset.sha,btn.dataset.status)}catch(err){note(err?.message||String(err),'bad')}finally{btn.disabled=false}return}
 if(a==='request-code-restore'){await requestCodeRestore(btn.dataset.file,btn.dataset.sha).catch(err=>note(err?.message||String(err),'bad'));return}
 if(a==='new-company'){companyForm(null);return}
 if(a==='edit-company'){const c=companyById(btn.dataset.id);if(c)companyForm(c);return}
 if(a==='edit-company-plan'){const c=companyById(btn.dataset.id);if(c)companyPlanForm(c);return}
 if(a==='new-plan'){planForm(null);return}
 if(a==='edit-plan'){const p=planByCode(btn.dataset.code);if(p)planForm(p);return}
 if(a==='company-members'){const c=companyById(btn.dataset.id);if(c){const q=c.ragione_sociale||c.nome_app||'';document.getElementById('memberSearch').value=q;filterRows('membersTable',q);document.getElementById('membersTable').scrollIntoView({behavior:'smooth',block:'start'});note('Elenco utenti filtrato per società: '+q)}return}
 if(a==='save-member'){const company=btn.dataset.company,user=btn.dataset.user,key=company+':'+user,role=document.querySelector('[data-role-for="'+CSS.escape(key)+'"]'),active=document.querySelector('[data-active-for="'+CSS.escape(key)+'"]');btn.disabled=true;await action(async()=>{await rpc('eventour_superadmin_update_member',{p_azienda_id:company,p_user_id:user,p_role:role.value,p_active:active.checked});return 'Accesso utente aggiornato.'},true);return}
});
window.addEventListener('error',e=>fail(e.message||'Errore JavaScript'));
window.addEventListener('unhandledrejection',e=>fail(e.reason?.message||String(e.reason||'Errore promessa')));
window.addEventListener('DOMContentLoaded',()=>{sb=window.supabase.createClient(URL,KEY);const refresh=document.getElementById('refreshBtn'),back=document.getElementById('backBtn');if(refresh)refresh.addEventListener('click',async()=>{refresh.disabled=true;refresh.textContent='Aggiornamento…';await load();refresh.disabled=false;refresh.textContent='↻ Aggiorna'});if(back)back.addEventListener('click',()=>location.href='index.html');load()},{once:true});
})();