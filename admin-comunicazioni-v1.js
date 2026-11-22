/* ADMIN COMUNICAZIONI V4 — News / Sponsor / WhatsApp. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const state=()=>window.adminState||{};
const selected=()=>window.getTorneoAdminCorrente?.()||((state().tornei||[]).find(t=>String(t.id)===String(state().torneoSelezionato))||null);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cfgOf=t=>t?.configurazione&&typeof t.configurazione==='object'?{...t.configurazione}:{};

async function saveCfg(t,cfg){
const sb=window.supabaseClient||window.sb;
if(!sb||!t){alert('Torneo o connessione Supabase non disponibile.');return false}
const cleanCfg={...(cfg||{})};
const {data,error}=await sb.from('tornei').update({configurazione:cleanCfg}).eq('id',t.id).select('id,configurazione').maybeSingle();
if(error){console.error('Errore salvataggio configurazione:',error);alert('Errore salvataggio: '+error.message);return false}
if(!data){alert('Configurazione non salvata: il torneo selezionato non è stato aggiornato.');return false}
t.configurazione=data.configurazione||cleanCfg;
window.adminState=state();
try{localStorage.setItem(window.__adminStorageKey||'padel_admin_state',JSON.stringify(state()))}catch(e){}
return true
}

async function loadGlobalSponsors(){
const sb=window.supabaseClient||window.sb;
const aziendaId=String(window.aziendaId||'').trim();
if(!sb||!aziendaId){alert('Società non identificata: gestione sponsor bloccata per proteggere i dati degli altri tenant.');return []}
const {data,error}=await sb.from('sponsor').select('id,nome,immagine,video,link,azienda_id').eq('azienda_id',aziendaId).order('id',{ascending:true});
if(error){console.error('Errore caricamento sponsor:',error);alert('Errore caricamento sponsor: '+error.message);return []}
return data||[];
}

function shell(title,sub,body){
const root=$('appContent');
if(!root)return;
root.innerHTML=`<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><button class="btn" id="comBack">← Torna al torneo</button></div>${body}`;
$('comBack')?.addEventListener('click',()=>window.openAdminPage?.('torneo'))
}

async function news(){return window.openAdminNews?.()}

async function sponsor(){
const aziendaId=String(window.aziendaId||'').trim();
if(!aziendaId){shell('Sponsor','Seleziona una società per gestire i suoi sponsor.',`<div class="card"><div class="card-body">Contesto società non disponibile. Per sicurezza non è possibile mostrare o modificare sponsor.</div></div>`);return}
const items=await loadGlobalSponsors();
const form=(editing=null)=>{
const s=editing||{};
return `<div class="feature-form" id="sponsorForm"><h3>${editing?'Modifica sponsor':'Nuovo sponsor'}</h3><label>Nome sponsor</label> <input id="sponsorName" class="input" value="${esc(s.nome||'')}" placeholder="Nome sponsor"><label>Logo sponsor</label> <input id="sponsorLogo" class="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"> <small class="notice">${editing&&s.immagine?'Seleziona un nuovo file solo se vuoi sostituire il logo attuale.':'Seleziona il logo dello sponsor.'}</small><label>Video sponsor</label> <input id="sponsorVideo" class="input" value="${esc(s.video||'')}" placeholder="https://.../video"> <small class="notice">URL del video o della pagina video.</small><label>Link sponsor</label> <input id="sponsorUrl" class="input" value="${esc(s.link||'')}" placeholder="https://.../"> <small class="notice">Inserisci il sito dello sponsor.</small><div class="admin-feature-actions"><button class="btn primary" id="sponsorSave">${editing?'💾 Salva modifiche':'＋ Aggiungi sponsor'}</button>${editing?'<button type="button" class="btn" id="sponsorCancel">Annulla</button>':''}</div></div>`;
};
const list=items.length?items.map(n=>`<div class="list-item" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="width:90px;min-width:90px;height:60px;border-radius:10px;overflow:hidden;background:rgba(15,23,42,.12);display:flex;align-items:center;justify-content:center">${n.immagine?`<img src="${esc(n.immagine)}" alt="${esc(n.nome||'Sponsor')}" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.style.display='none';this.parentElement.innerHTML='🖼️'">`:'<span style="font-size:24px">🏢</span>'}</div><div style="flex:1;min-width:220px"><strong style="display:block;font-size:15px">${esc(n.nome||'Sponsor senza nome')}</strong><small style="display:block;margin-top:4px">${n.link?`Link: <a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(n.link)}</a>`:'Nessun link'}</small><small style="display:block;margin-top:3px">${n.immagine?'Logo caricato':'Nessun logo caricato'} · ${n.video?`Video: <a href="${esc(n.video)}" target="_blank" rel="noopener noreferrer">Apri video</a>`:'Nessun video'}</small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small" data-sponsor-edit="${esc(n.id)}">✏️ Modifica</button><button type="button" class="btn small danger" data-sponsor-del="${esc(n.id)}">Elimina</button></div></div>`).join(''):'<div class="empty">Nessuno sponsor configurato. Inserisci il primo sponsor usando il modulo qui accanto.</div>';
shell('Sponsor','Sponsor della tua società · visibili nella vetrina pubblica',`<div class="card feature-card"><div class="card-head"><div><h2>Gestione Sponsor della società</h2><span class="notice">Gli sponsor inseriti qui appariranno nella pagina pubblica Sponsor della tua società e nel banner scorrevole, dove previsto.</span></div></div><div class="card-body"><div class="section-grid"><div id="sponsorEditor">${form()}</div><div><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h3>I tuoi sponsor</h3><p class="notice">${items.length} sponsor configurat${items.length===1?'o':'i'}</p></div></div><div id="sponsorList" class="feature-list">${list}</div></div></div></div></div>`);
const reset=()=>{const box=$('sponsorEditor');if(box)box.innerHTML=form();bindForm()};
const bindForm=()=>{
$('sponsorCancel')?.addEventListener('click',reset);
$('sponsorSave')?.addEventListener('click',async()=>{
const nome=$('sponsorName')?.value.trim(),video=$('sponsorVideo')?.value.trim(),link=$('sponsorUrl')?.value.trim(),logoFile=$('sponsorLogo')?.files?.[0];
if(!nome){alert('Inserisci il nome dello sponsor.');return}
if(!link){alert('Inserisci il link del sito dello sponsor.');return}
if(logoFile){const allowedTypes=['image/png','image/jpeg','image/webp','image/svg+xml'];if(!allowedTypes.includes(logoFile.type)){alert('Il logo deve essere un file PNG, JPG, WEBP o SVG.');return}if(logoFile.size>2*1024*1024){alert('Il logo è troppo grande. Usa un file massimo di 2 MB.');return}}
const sb=window.supabaseClient||window.sb;const aziendaId=String(window.aziendaId||'').trim();if(!sb||!aziendaId){alert('Società o connessione Supabase non disponibile.');return}
const saveButton=$('sponsorSave'),editId=saveButton?.dataset.editId;if(saveButton){saveButton.disabled=true;saveButton.textContent='⏳ Salvataggio...'}
try{let immagine=editId?(items.find(x=>String(x.id)===String(editId))?.immagine||''):'';if(logoFile){immagine=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Impossibile leggere il file del logo.'));reader.readAsDataURL(logoFile)})}let savedId=editId||null;
if(editId){
 const {data,error}=await sb.from('sponsor').update({nome,immagine,video,link}).eq('id',editId).eq('azienda_id',aziendaId).select('id,nome,immagine,video,link,azienda_id').maybeSingle();
 if(error)throw new Error('Errore salvataggio sponsor: '+error.message);
 if(!data)throw new Error('Lo sponsor selezionato non è stato aggiornato.');
 savedId=data.id;
}else{
 const {data,error}=await sb.from('sponsor').insert({nome,immagine,video,link,azienda_id:aziendaId}).select('id,nome,immagine,video,link,azienda_id').single();
 if(error)throw new Error('Errore salvataggio sponsor: '+error.message);
 if(!data)throw new Error('Sponsor salvato senza ricevere il relativo ID.');
 savedId=data.id;
}
if(!logoFile && savedId && link){
 const {data:logoData,error:logoError}=await sb.functions.invoke('sponsor-logo-from-site',{body:{sponsorId:Number(savedId),link}});
 if(logoError)console.warn('Logo automatico non disponibile:',logoError);
 else if(!logoData?.ok)console.warn('Logo automatico non trovato:',logoData?.error||logoData);
}
await sponsor()}catch(error){console.error('Errore gestione sponsor:',error);alert(error?.message||'Errore durante il salvataggio dello sponsor.');if(saveButton){saveButton.disabled=false;saveButton.textContent=editId?'💾 Salva modifiche':'＋ Aggiungi sponsor'}}
});
};
bindForm();
document.querySelectorAll('[data-sponsor-edit]').forEach(b=>b.onclick=()=>{const item=items.find(x=>String(x.id)===String(b.dataset.sponsorEdit));if(!item)return;const box=$('sponsorEditor');if(box){box.innerHTML=form(item);const save=$('sponsorSave');if(save)save.dataset.editId=item.id;bindForm();box.scrollIntoView({behavior:'smooth',block:'nearest'})}});
document.querySelectorAll('[data-sponsor-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Eliminare questo sponsor della società?'))return;const sb=window.supabaseClient||window.sb;const aziendaId=String(window.aziendaId||'').trim();if(!sb||!aziendaId)return;const {error}=await sb.from('sponsor').delete().eq('id',b.dataset.sponsorDel).eq('azienda_id',aziendaId);if(error){alert('Errore eliminazione sponsor: '+error.message);return}await sponsor()});
}

function whatsapp(){
const t=selected();if(!t){alert('Seleziona prima un torneo');return}
const link=new URL('tabellone.html',location.href).href+'?idTorneo='+encodeURIComponent(t.id)+(window.aziendaId?'&azienda_id='+encodeURIComponent(window.aziendaId):'');
shell('WhatsApp',`${esc(t.nome)} · ID ${esc(t.id)}`,`<div class="card feature-card"><div class="card-head"><div><h2>Comunicazioni WhatsApp</h2><span class="notice">Messaggio pronto con il link del torneo selezionato</span></div></div><div class="card-body"><label>Messaggio</label><textarea id="waText" class="input" rows="6">Ciao! Ti invitiamo al torneo ${esc(t.nome)} del ${esc(t.data||t.data_torneo||'')}.

${esc(link)}</textarea><div class="admin-feature-actions"><button class="btn primary" id="waOpen">📱 Apri WhatsApp</button><button class="btn" id="waCopy">📋 Copia link torneo</button></div><div class="notice" style="margin-top:14px">Il link è sempre riferito al torneo attualmente selezionato.</div></div></div>`);
$('waOpen').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent($('waText')?.value||''),'_blank');
$('waCopy').onclick=()=>navigator.clipboard?.writeText(link).then(()=>alert('Link copiato negli appunti.'))
}

function openPosterAdmin(){
 news();
 setTimeout(()=>{
  const panel=document.getElementById('naiManualPosterPanel');
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
 },900);
}
function bindComLinks(){
document.querySelectorAll('[data-com-page]').forEach(b=>{if(b.dataset.comBound)return;b.dataset.comBound='1';b.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');const p=b.dataset.comPage;if(p==='news')news();else if(p==='locandine')openPosterAdmin();else if(p==='sponsor')sponsor();else if(p==='whatsapp')whatsapp()})})
}
function bindSidebar(){document.querySelectorAll('#areaAdmin .sidebar [data-page]').forEach(b=>{if(b.dataset.sidebarBound)return;b.dataset.sidebarBound='1';b.addEventListener('click',async()=>{const page=b.dataset.page;if(!page)return;document.querySelectorAll('#areaAdmin .sidebar [data-page]').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(typeof window.openAdminPage==='function')await window.openAdminPage(page)})})}
function bindAll(){bindSidebar();bindComLinks()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAll,{once:true});else bindAll();
window.openAdminSponsor=()=>sponsor();
window.openAdminComPage=p=>p==='news'?news():p==='locandine'?openPosterAdmin():p==='sponsor'?sponsor():whatsapp();

})();

/* NEWS EDITOR V2 — gestione contenuti, modifica, evidenza e ordine. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'<','>':'>','\"':'\"'}[m]));
const selected=()=>window.getTorneoAdminCorrente?.()||((window.adminState?.tornei||[]).find(t=>String(t.id)===String(window.adminState?.torneoSelezionato))||null);
const cfgOf=t=>t?.configurazione&&typeof t.configurazione==='object'?{...t.configurazione}:{};
async function saveNewsCfg(t,cfg){const sb=window.supabaseClient||window.sb;if(!sb||!t){alert('Torneo o connessione Supabase non disponibile.');return false}const {data,error}=await sb.from('tornei').update({configurazione:{...(cfg||{})}}).eq('id',t.id).select('id,configurazione').maybeSingle();if(error){console.error(error);alert('Errore salvataggio News: '+error.message);return false}if(!data){alert('La configurazione News non è stata salvata.');return false}t.configurazione=data.configurazione||cfg;try{localStorage.setItem(window.__adminStorageKey||'padel_admin_state',JSON.stringify(window.adminState||{}))}catch(e){}return true}
const fileToDataUrl=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Impossibile leggere l’immagine.'));r.readAsDataURL(file)});
const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fileToDataUrl2=fileToDataUrl;
const typeIcon=t=>{const x=String(t||'').toLowerCase();if(x.includes('torneo'))return '🏆';if(x.includes('promo'))return '🔥';if(x.includes('evento'))return '📅';if(x.includes('ricordo'))return '📸';if(x.includes('prodott'))return '🎾';if(x.includes('articol'))return '📰';return '📢'};
const dateText=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})};
async function loadGlobalNews(){const sb=window.supabaseClient||window.sb;const aziendaId=String(window.aziendaId||'').trim();if(!sb||!aziendaId){console.error('Gestione News bloccata: contesto società non disponibile.');alert('Società non identificata: gestione News non disponibile.');return []}const {data,error}=await sb.from('news').select('id,titolo,testo,immagine,pubblicata,created_at,tipo,link,in_evidenza,ordine,torneo_id,azienda_id').eq('azienda_id',aziendaId).order('ordine',{ascending:true}).order('created_at',{ascending:false});if(error){console.error('Errore caricamento News:',error);alert('Errore caricamento News: '+error.message);return []}return data||[]}
async function saveGlobalNews(row){const sb=window.supabaseClient||window.sb;const aziendaId=String(window.aziendaId||'').trim();if(!sb||!aziendaId){alert('Società non identificata: salvataggio News bloccato.');return false}const payload={azienda_id:aziendaId,titolo:row.titolo,testo:row.testo,immagine:row.immagine||null,pubblicata:row.pubblicata!==false,tipo:row.tipo||'Comunicazione',link:row.link||null,in_evidenza:!!row.in_evidenza,ordine:Number(row.ordine)||0,torneo_id:row.torneo_id?Number(row.torneo_id):null};let q;if(row.id)q=await sb.from('news').update(payload).eq('id',row.id).eq('azienda_id',aziendaId).select('*').maybeSingle();else q=await sb.from('news').insert(payload).select('*').single();if(q.error){console.error('Errore salvataggio News:',q.error);alert('Errore salvataggio News: '+q.error.message);return false}if(!q.data){alert('Nessuna News è stata salvata: verifica i permessi della società.');return false}return true}
async function newsEditor(){
const root=$('appContent');if(!root)return;
let editingId=null;
let items=await loadGlobalNews();
const types=['Comunicazione','Promozione','Evento','Ricordo','Prodotto','Articolo','Avviso'];
const styleId='eventour-news-editor-style';
if(!document.getElementById(styleId)){
const style=document.createElement('style');style.id=styleId;
style.textContent='.ev-news{color:#eaf1f8}.ev-news *{box-sizing:border-box}.ev-news-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin:0 0 20px}.ev-news-head h1{font-size:clamp(24px,3vw,32px);margin:0 0 6px;color:#fff}.ev-news-head p{margin:0;color:#91a5ba;font-size:13px}.ev-news-back{border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.07);color:#eaf1f8;padding:10px 13px;cursor:pointer}.ev-news-layout{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(300px,.88fr);gap:18px;align-items:start}.ev-news-panel{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(145deg,rgba(16,38,61,.96),rgba(8,24,41,.96));box-shadow:0 16px 42px rgba(0,0,0,.18);overflow:hidden}.ev-news-panel-head{padding:19px 21px;border-bottom:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;gap:12px;align-items:center}.ev-news-panel-head h2{margin:0;color:#fff;font-size:17px}.ev-news-panel-head p{margin:5px 0 0;color:#91a5ba;font-size:11px}.ev-news-form{padding:20px;display:grid;gap:13px}.ev-news-field{display:grid;gap:6px}.ev-news-field label,.ev-news-label{font-size:11px;font-weight:800;letter-spacing:.5px;color:#c9d7e5}.ev-news-field input,.ev-news-field select,.ev-news-field textarea,.ev-news-search{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(2,13,25,.52);color:#fff;padding:11px 12px;font:500 13px Arial,sans-serif;outline:none}.ev-news-field input:focus,.ev-news-field select:focus,.ev-news-field textarea:focus,.ev-news-search:focus{border-color:#e5c75e;box-shadow:0 0 0 3px rgba(229,199,94,.1)}.ev-news-field select option{background:#10263d;color:#fff}.ev-news-field textarea{min-height:150px;resize:vertical;line-height:1.6}.ev-news-help{font-size:10px;color:#8197ad;line-height:1.5}.ev-news-upload{padding:14px;border:1px dashed rgba(229,199,94,.35);border-radius:12px;background:rgba(229,199,94,.045)}.ev-news-preview{margin-top:10px;display:none;position:relative;max-width:100%;width:100%;height:190px;overflow:hidden;border-radius:12px;background:#061525}.ev-news-preview img{width:100%;height:100%;object-fit:contain}.ev-news-checks{display:flex;gap:18px;flex-wrap:wrap;padding:5px 0}.ev-news-check{display:flex;align-items:center;gap:8px;color:#d7e1eb;font-size:12px;font-weight:700}.ev-news-check input{accent-color:#e5c75e;width:16px;height:16px}.ev-news-actions{display:flex;gap:9px;flex-wrap:wrap;padding-top:5px}.ev-news-btn{border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:11px 15px;background:rgba(255,255,255,.07);color:#fff;font-weight:800;font-size:12px;cursor:pointer}.ev-news-btn.primary{background:#e8cf72;border-color:#e8cf72;color:#15283d}.ev-news-btn:disabled{opacity:.55;cursor:wait}.ev-news-list{padding:12px;display:grid;gap:10px}.ev-news-item{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;padding:11px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035)}.ev-news-thumb{width:86px;height:76px;border-radius:9px;overflow:hidden;background:#07182b;display:grid;place-items:center;color:#e8cf72;font-size:24px}.ev-news-thumb img{width:100%;height:100%;object-fit:cover}.ev-news-item-main{min-width:0}.ev-news-item-title{font-size:13px;font-weight:800;color:#fff;line-height:1.35}.ev-news-meta{display:flex;gap:7px;flex-wrap:wrap;margin:6px 0;color:#91a5ba;font-size:10px}.ev-news-status{padding:3px 7px;border-radius:99px;background:rgba(81,210,143,.12);color:#7ee2ae;font-weight:800}.ev-news-status.draft{background:rgba(255,198,90,.12);color:#f4d27e}.ev-news-excerpt{font-size:11px;color:#a9bacb;line-height:1.45}.ev-news-item-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.ev-news-mini{border:1px solid rgba(255,255,255,.13);border-radius:8px;background:rgba(255,255,255,.06);color:#dbe6f0;padding:6px 8px;font-size:10px;font-weight:800;cursor:pointer}.ev-news-mini.danger{color:#ffaaaa;border-color:rgba(255,120,120,.2)}.ev-news-empty{padding:25px 14px;text-align:center;color:#91a5ba;font-size:12px;line-height:1.6}.ev-news-count{font-size:11px;color:#e8cf72;font-weight:800}.ev-news-search-wrap{padding:12px 12px 0}.ev-news-search{font-size:12px}.ev-news-notice{padding:11px 13px;border-radius:10px;background:rgba(229,199,94,.08);border:1px solid rgba(229,199,94,.15);color:#d7c98f;font-size:11px;line-height:1.5}@media(max-width:900px){.ev-news-layout{grid-template-columns:1fr}}@media(max-width:560px){.ev-news-head{flex-direction:column}.ev-news-back{width:100%}.ev-news-form{padding:15px}.ev-news-panel-head{padding:16px}.ev-news-item{grid-template-columns:68px minmax(0,1fr);gap:9px;padding:9px}.ev-news-thumb{width:68px;height:68px}.ev-news-actions .ev-news-btn{flex:1}}';
document.head.appendChild(style)}
const render=()=>{
const current=[...items].sort((a,b)=>Number(b.in_evidenza)-Number(a.in_evidenza)||String(b.created_at||'').localeCompare(String(a.created_at||'')));
const editing=current.find(n=>String(n.id)===String(editingId));
const initialImage=editing?.immagine||'';
root.innerHTML='<section class="ev-news"><div class="ev-news-head"><div><h1>News &amp; Comunicazioni</h1><p>Redazione autonoma della società · le News pubblicate saranno visibili nella pagina pubblica.</p></div><button type="button" class="ev-news-back" id="newsBack">← Torna alla gestione</button></div><div class="ev-news-layout"><section class="ev-news-panel"><div class="ev-news-panel-head"><div><h2>'+(editing?'Modifica notizia':'Crea una nuova notizia')+'</h2><p>Prepara il contenuto, aggiungi una fotografia e scegli quando renderlo visibile.</p></div><span class="ev-news-count">'+(editing?'MODIFICA':'NUOVA')+'</span></div><div class="ev-news-form"><div class="ev-news-field"><label for="newsType">CATEGORIA</label><select id="newsType">'+types.map(x=>'<option value="'+esc2(x)+'">'+esc2(x)+'</option>').join('')+'</select></div><div class="ev-news-field"><label for="newsTitle">TITOLO DELLA NOTIZIA</label><input id="newsTitle" maxlength="160" placeholder="Es. Una nuova stagione di eventi Eventour"></div><div class="ev-news-field"><label for="newsText">TESTO</label><textarea id="newsText" placeholder="Scrivi qui la comunicazione. Puoi raccontare la notizia con tutti i dettagli."></textarea><span class="ev-news-help">Il testo sarà mostrato nella scheda e nella lettura completa della notizia.</span></div><div class="ev-news-field ev-news-upload"><label for="newsImage">FOTOGRAFIA / LOCANDINA</label><input id="newsImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><span class="ev-news-help">Immagine facoltativa · PNG, JPG, WEBP o GIF · massimo 5 MB.</span><div class="ev-news-preview" id="newsPreview"><img id="newsPreviewImage" alt="Anteprima immagine"></div></div><div class="ev-news-field"><label for="newsLink">COLLEGAMENTO ESTERNO (FACOLTATIVO)</label><input id="newsLink" type="url" placeholder="https://..."></div><div class="ev-news-checks"><label class="ev-news-check"><input id="newsPublished" type="checkbox"> Pubblica subito</label><label class="ev-news-check"><input id="newsFeatured" type="checkbox"> Metti in evidenza</label></div><div class="ev-news-notice">Le notizie vengono salvate esclusivamente nella sezione News della società. Non vengono importati contenuti dai tornei o dal Mercatino.</div><div class="ev-news-actions"><button type="button" class="ev-news-btn primary" id="newsSave">'+(editing?'Salva modifiche':'Salva notizia')+'</button>'+(editing?'<button type="button" class="ev-news-btn" id="newsCancel">Annulla</button>':'')+'</div></div></section><section class="ev-news-panel"><div class="ev-news-panel-head"><div><h2>Archivio News</h2><p>Gestisci, modifica o rimuovi le comunicazioni della società.</p></div><span class="ev-news-count">'+current.length+' '+(current.length===1?'NOTIZIA':'NOTIZIE')+'</span></div><div class="ev-news-search-wrap"><input class="ev-news-search" id="newsListSearch" type="search" placeholder="Cerca nell’archivio..."></div><div class="ev-news-list" id="newsList"></div></section></div></section>';
$('newsBack')?.addEventListener('click',()=>window.openAdminPage?.('torneo'));
$('newsType').value=editing?.tipo||'Comunicazione';
$('newsTitle').value=editing?.titolo||'';
$('newsText').value=editing?.testo||'';
$('newsLink').value=editing?.link||'';
$('newsPublished').checked=editing?editing.pubblicata!==false:true;
$('newsFeatured').checked=!!editing?.in_evidenza;
const preview=$('newsPreview'),previewImage=$('newsPreviewImage');
if(initialImage){previewImage.src=initialImage;preview.style.display='block'}
$('newsImage')?.addEventListener('change',async()=>{const file=$('newsImage').files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){alert('L’immagine deve essere PNG, JPG, WEBP o GIF.');$('newsImage').value='';return}if(file.size>5*1024*1024){alert('L’immagine è troppo grande. Usa un file massimo di 5 MB.');$('newsImage').value='';return}try{previewImage.src=await fileToDataUrl2(file);preview.style.display='block'}catch(e){alert(e.message)}});
$('newsCancel')?.addEventListener('click',()=>{editingId=null;render()});
$('newsSave')?.addEventListener('click',async()=>{const btn=$('newsSave');const tipo=$('newsType').value,titolo=$('newsTitle').value.trim(),testo=$('newsText').value.trim(),link=$('newsLink').value.trim(),featured=$('newsFeatured').checked,pubblicata=$('newsPublished').checked,file=$('newsImage').files?.[0];if(!titolo||!testo){alert('Inserisci il titolo e il testo della notizia.');return}if(link&&!/^https?:\/\//i.test(link)){alert('Il collegamento deve iniziare con http:// oppure https://');return}btn.disabled=true;btn.textContent='Salvataggio...';try{let image=editing?.immagine||'';if(file)image=await fileToDataUrl2(file);const row={id:editing?.id,titolo,testo,immagine:image,pubblicata,tipo,link:link||null,in_evidenza:featured,ordine:editing?.ordine??items.length,torneo_id:null};if(await saveGlobalNews(row)){items=await loadGlobalNews();editingId=null;render()}}catch(e){console.error('Salvataggio News:',e);alert('Non è stato possibile salvare la notizia: '+(e?.message||e))}finally{if(document.getElementById('newsSave')){document.getElementById('newsSave').disabled=false;document.getElementById('newsSave').textContent=editingId?'Salva modifiche':'Salva notizia'}}});
const list=$('newsList');
const drawList=(query='')=>{const q=query.trim().toLowerCase();const filtered=current.filter(n=>!q||String((n.titolo||'')+' '+(n.testo||'')+' '+(n.tipo||'')).toLowerCase().includes(q));list.innerHTML=filtered.length?'':'<div class="ev-news-empty">Ancora nessuna notizia.<br>La prima comunicazione che creerai comparirà qui.</div>';filtered.forEach(n=>{const row=document.createElement('article');row.className='ev-news-item';const thumb=document.createElement('div');thumb.className='ev-news-thumb';if(n.immagine){const img=document.createElement('img');img.src=n.immagine;img.alt='';thumb.appendChild(img)}else thumb.textContent='✦';const main=document.createElement('div');main.className='ev-news-item-main';const status=n.pubblicata===false?'<span class="ev-news-status draft">BOZZA</span>':'<span class="ev-news-status">PUBBLICATA</span>';main.innerHTML='<div class="ev-news-item-title">'+esc2(n.titolo||'Senza titolo')+'</div><div class="ev-news-meta"><span>'+esc2(n.tipo||'Comunicazione')+'</span>'+status+(n.in_evidenza?'<span>★ IN EVIDENZA</span>':'')+'</div><div class="ev-news-excerpt">'+esc2(String(n.testo||'').slice(0,115))+(String(n.testo||'').length>115?'…':'')+'</div><div class="ev-news-item-actions"><button type="button" class="ev-news-mini" data-edit="'+esc2(n.id)+'">Modifica</button><button type="button" class="ev-news-mini" data-publish="'+esc2(n.id)+'">'+(n.pubblicata===false?'Pubblica':'Rendi bozza')+'</button><button type="button" class="ev-news-mini" data-feature="'+esc2(n.id)+'">'+(n.in_evidenza?'Togli evidenza':'Metti in evidenza')+'</button><button type="button" class="ev-news-mini danger" data-del="'+esc2(n.id)+'">Elimina</button></div>';row.appendChild(thumb);row.appendChild(main);list.appendChild(row)})};
drawList();
$('newsListSearch')?.addEventListener('input',e=>drawList(e.target.value));
list.addEventListener('click',async e=>{const b=e.target.closest('button[data-edit],button[data-publish],button[data-feature],button[data-del]');if(!b)return;const id=b.dataset.edit||b.dataset.publish||b.dataset.feature||b.dataset.del;const n=current.find(x=>String(x.id)===String(id));if(!n)return;if(b.dataset.edit){editingId=b.dataset.edit;render();return}const sb=window.supabaseClient||window.sb,aziendaId=String(window.aziendaId||'').trim();if(!sb||!aziendaId){alert('Società non identificata.');return}if(b.dataset.publish){const {error}=await sb.from('news').update({pubblicata:n.pubblicata===false}).eq('id',id).eq('azienda_id',aziendaId);if(error){alert('Errore aggiornamento pubblicazione: '+error.message);return}}else if(b.dataset.feature){const {error}=await sb.from('news').update({in_evidenza:!n.in_evidenza}).eq('id',id).eq('azienda_id',aziendaId);if(error){alert('Errore aggiornamento evidenza: '+error.message);return}}else if(b.dataset.del){if(!confirm('Eliminare definitivamente la notizia "'+(n.titolo||'Senza titolo')+'"?'))return;const {error}=await sb.from('news').delete().eq('id',id).eq('azienda_id',aziendaId);if(error){alert('Errore eliminazione News: '+error.message);return}}items=await loadGlobalNews();render()});
};
render();
}
window.openAdminNews=()=>newsEditor();
const oldOpenAdminComPage=window.openAdminComPage;
window.openAdminComPage=p=>{if(p==='sponsor'){window.openAdminSponsor?.();return}if(p==='news'||p==='news-ai'){window.openAdminNews?.();return}return oldOpenAdminComPage?.(p)};
document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-com-page="news"],[data-com-page="sponsor"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();document.getElementById('mobileOverlay')?.classList.remove('open');window.openAdminComPage?.(b.dataset.comPage==='sponsor'?'sponsor':'news-ai')},true);
})();
