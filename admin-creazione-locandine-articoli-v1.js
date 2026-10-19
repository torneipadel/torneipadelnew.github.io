/* EVENTOUR — Creazione Locandine & Articoli
 * Flusso unico: selezione contenuto -> editor -> anteprima -> salvataggio collegato.
 * Non modifica i flussi di torneo, autenticazione, sponsor o WhatsApp.
 */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb = () => window.supabaseClient || window.sb;
const state = () => window.adminState || {};
const tournaments = () => Array.isArray(state().tornei) ? state().tornei : [];
const cfgOf = t => t && t.configurazione && typeof t.configurazione === 'object' ? Object.assign({}, t.configurazione) : {};
const W = 720, H = 900;
let kind = 'torneo', selectedId = '', selectedTournamentId = '', newsRows = [], marketRows = [], activeRows = null;
let bgImage = null, logoImage = null, layers = [], layerSeq = 1, editingRow = null, busy = false, existingPosterLoaded = false;

function css() {
 if ($('eventourPosterStudioStyle')) return;
 const s = document.createElement('style');
 s.id = 'eventourPosterStudioStyle';
 s.textContent = '#eventourPosterStudio{display:grid;gap:16px}#eventourPosterStudio .eps-card{padding:16px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.04)}#eventourPosterStudio .eps-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,440px);gap:18px;align-items:start}#eventourPosterStudio label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px}#eventourPosterStudio input,#eventourPosterStudio select,#eventourPosterStudio textarea{width:100%;box-sizing:border-box}#eventourPosterStudio .eps-field{padding:9px;border-radius:8px}#eventourPosterStudio .eps-layer{padding:10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;margin-top:10px}#eventourPosterStudio .eps-layer-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#eventourPosterStudio .eps-preview{width:100%;max-width:440px;margin:auto;overflow:hidden;border-radius:12px;background:#06111f}#eventourPosterStudio canvas{width:100%;height:auto;display:block}#eventourPosterStudio .eps-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#eventourPosterStudio .eps-status{min-height:22px;margin-top:10px;white-space:pre-wrap}@media(max-width:900px){#eventourPosterStudio .eps-grid{grid-template-columns:1fr}#eventourPosterStudio .eps-preview{max-width:100%}}';
 document.head.appendChild(s);
}
function activeTournaments() {
 return activeRows !== null ? activeRows : tournaments().filter(t => String(t.stato || '').toLowerCase() === 'attivo' && t.pubblicato === true);
}
function currentTournament() {
 return activeTournaments().find(t => String(t.id) === String(selectedId)) || null;
}
function setStatus(message, error) {
 const el = $('epsStatus');
 if (el) { el.textContent = message || ''; el.style.color = error ? '#ffb4b4' : ''; }
}
function chooseSavedTarget(id, title) {
 const select=$('epsTarget');if(!select)return;
 let option=Array.from(select.options).find(o=>String(o.value)===String(id));
 if(!option){option=document.createElement('option');option.value=String(id);option.textContent=String(title||('Contenuto '+id));select.appendChild(option);}
 option.textContent=String(title||('Contenuto '+id));select.value=String(id);selectedId=String(id);
}
function makeField(label, id, value, type) {
 const tag = type === 'textarea' ? 'textarea' : 'input';
 const typeAttr = type && type !== 'textarea' ? ' type="' + type + '"' : '';
 const valueAttr = type === 'textarea' ? '' : ' value="' + esc(value || '') + '"';
 return '<label for="' + id + '">' + esc(label) + '</label><' + tag + ' id="' + id + '" class="input eps-field"' + typeAttr + valueAttr + (type === 'textarea' ? ' rows="4">' + esc(value || '') + '</textarea>' : '>');
}
function loadLogo() {
 return new Promise(resolve => {
  if (logoImage && logoImage.complete) { resolve(logoImage); return; }
  const img = new Image();
  img.onload = () => { logoImage = img; resolve(img); };
  img.onerror = () => resolve(null);
  img.src = 'loghi/eventour_trasp.png?v=4';
 });
}
function fitImage(ctx, image) {
 const scale = Math.max(W / image.width, H / image.height);
 const w = image.width * scale, h = image.height * scale;
 ctx.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
}
async function draw() {
 const canvas = $('epsCanvas');
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 canvas.width = W; canvas.height = H;
 if (bgImage) {
  fitImage(ctx, bgImage);
  ctx.fillStyle = 'rgba(3,12,24,.30)'; ctx.fillRect(0,0,W,H);
 } else {
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#071b2b'); grad.addColorStop(.55,'#0b2940'); grad.addColorStop(1,'#04101d');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  const logo = await loadLogo();
  if (logo) {
   const scale = Math.min((W * .72) / logo.width, (H * .25) / logo.height);
   const w = logo.width * scale, h = logo.height * scale;
   ctx.drawImage(logo, (W-w)/2, 56, w, h);
  }
 }
 layers.forEach(layer => drawLayer(ctx, layer));
}
function drawLayer(ctx, layer) {
 if (!layer.text) return;
 ctx.save();
 ctx.fillStyle = layer.color || '#ffffff';
 ctx.textAlign = layer.align || 'center';
 ctx.textBaseline = 'middle';
 ctx.font = (layer.bold ? '800 ' : '600 ') + Math.max(8, Number(layer.size) || 34) + 'px Arial';
 const lines = String(layer.text).split('\n');
 const size = Math.max(8, Number(layer.size) || 34);
 const lh = size * 1.18;
 const startY = Number(layer.y) - (lines.length - 1) * lh / 2;
 lines.forEach((line, i) => {
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 5;
  ctx.fillText(line, Number(layer.x), startY + i * lh, W - 40);
 });
 ctx.restore();
}
function renderLayers() {
 const box = $('epsLayers');
 if (!box) return;
 box.innerHTML = layers.map((l,i) =>
  '<div class="eps-layer" data-layer="' + l.id + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong>Elemento ' + (i+1) + '</strong><button class="btn small" type="button" data-eps-delete="' + l.id + '">Elimina</button></div>' +
  '<label>Testo</label><textarea class="input eps-field" data-eps-text="' + l.id + '" rows="3">' + esc(l.text) + '</textarea>' +
  '<div class="eps-layer-grid"><div><label>Posizione X</label><input class="input eps-field" type="number" min="0" max="' + W + '" data-eps-num="x" data-id="' + l.id + '" value="' + l.x + '"></div>' +
  '<div><label>Posizione Y</label><input class="input eps-field" type="number" min="0" max="' + H + '" data-eps-num="y" data-id="' + l.id + '" value="' + l.y + '"></div>' +
  '<div><label>Dimensione</label><input class="input eps-field" type="number" min="8" max="120" data-eps-num="size" data-id="' + l.id + '" value="' + l.size + '"></div></div>' +
  '<div class="eps-layer-grid"><div><label>Colore</label><input type="color" data-eps-color="' + l.id + '" value="' + esc(l.color) + '"></div>' +
  '<div><label>Allineamento</label><select class="input eps-field" data-eps-align="' + l.id + '"><option value="left"' + (l.align==='left'?' selected':'') + '>Sinistra</option><option value="center"' + (l.align==='center'?' selected':'') + '>Centro</option><option value="right"' + (l.align==='right'?' selected':'') + '>Destra</option></select></div>' +
  '<div><label>Stile</label><select class="input eps-field" data-eps-bold="' + l.id + '"><option value="1"' + (l.bold?' selected':'') + '>Grassetto</option><option value="0"' + (!l.bold?' selected':'') + '>Normale</option></select></div></div>' +
  '<div class="eps-actions"><button class="btn small" type="button" data-eps-move="' + l.id + '" data-dx="-20" data-dy="0">←</button><button class="btn small" type="button" data-eps-move="' + l.id + '" data-dx="20" data-dy="0">→</button><button class="btn small" type="button" data-eps-move="' + l.id + '" data-dx="0" data-dy="-20">↑</button><button class="btn small" type="button" data-eps-move="' + l.id + '" data-dx="0" data-dy="20">↓</button></div></div>'
 ).join('');
 box.querySelectorAll('[data-eps-text]').forEach(el => el.addEventListener('input', () => { const l=layers.find(x=>String(x.id)===el.dataset.epsText); if(l){l.text=el.value;draw();} }));
 box.querySelectorAll('[data-eps-num]').forEach(el => el.addEventListener('input', () => { const l=layers.find(x=>String(x.id)===el.dataset.id); if(l){l[el.dataset.epsNum]=Number(el.value)||0;draw();} }));
 box.querySelectorAll('[data-eps-color]').forEach(el => el.addEventListener('input', () => { const l=layers.find(x=>String(x.id)===el.dataset.epsColor); if(l){l.color=el.value;draw();} }));
 box.querySelectorAll('[data-eps-align]').forEach(el => el.addEventListener('change', () => { const l=layers.find(x=>String(x.id)===el.dataset.epsAlign); if(l){l.align=el.value;draw();} }));
 box.querySelectorAll('[data-eps-bold]').forEach(el => el.addEventListener('change', () => { const l=layers.find(x=>String(x.id)===el.dataset.epsBold); if(l){l.bold=el.value==='1';draw();} }));
 box.querySelectorAll('[data-eps-delete]').forEach(el => el.addEventListener('click', () => {layers=layers.filter(x=>String(x.id)!==el.dataset.epsDelete);renderLayers();draw();}));
 box.querySelectorAll('[data-eps-move]').forEach(el => el.addEventListener('click', () => {const l=layers.find(x=>String(x.id)===el.dataset.epsMove);if(l){l.x=Math.max(0,Math.min(W,l.x+Number(el.dataset.dx)));l.y=Math.max(0,Math.min(H,l.y+Number(el.dataset.dy)));renderLayers();draw();}}));
}
function addLayer(text, x, y, size) {
 layers.push({id:layerSeq++,text:text||'',x:x==null?W/2:x,y:y==null?H/2:y,size:size||34,color:'#ffffff',align:'center',bold:true});
 renderLayers(); draw();
}
function categoryOptions() {
 return '<option value="torneo">Torneo</option><option value="news">News / Comunicazione</option><option value="articolo">Articolo</option><option value="mercatino">Articolo del mercatino</option>';
}
function renderStudio() {
 const root = $('appContent');
 if (!root) return;
 css();
 root.innerHTML = '<div class="page-head"><div><h1>Creazione Locandine &amp; Articoli</h1><p>Un solo flusso per selezionare il contenuto, creare la locandina e salvarla collegata all’elemento corretto.</p></div><button class="btn" type="button" id="epsBack">← Torna al torneo</button></div>' +
 '<div id="eventourPosterStudio"><section class="eps-card"><div class="eps-grid"><div><label for="epsKind">Tipo di contenuto</label><select id="epsKind" class="input">' + categoryOptions() + '</select>' +
 '<label for="epsTarget">Contenuto da collegare</label><select id="epsTarget" class="input"><option value="">Caricamento contenuti…</option></select><p class="notice" id="epsTargetHelp">Seleziona il contenuto prima di creare la locandina.</p>' +
 '<div id="epsContentFields"></div><label for="epsBgFile">Sfondo personalizzato (facoltativo)</label><input id="epsBgFile" class="input" type="file" accept="image/png,image/jpeg,image/webp">' +
 '<p class="notice">Selezionando una foto, questa sostituisce lo sfondo grafico Eventour per questa locandina. Puoi tornare allo sfondo Eventour con il pulsante Azzera sfondo.</p>' +
 '<div class="eps-actions"><button class="btn" type="button" id="epsResetBg">Azzera sfondo</button><button class="btn" type="button" id="epsAddText">＋ Aggiungi testo</button><button class="btn" type="button" id="epsResetText">Azzera testi</button></div>' +
 '<div id="epsLayers"></div><div class="eps-actions"><button class="btn" type="button" id="epsDownload">⬇ Scarica PNG</button><button class="btn primary" type="button" id="epsPublish">💾 Salva e collega la locandina</button></div><div id="epsStatus" class="notice eps-status" role="status" aria-live="polite"></div></div>' +
 '<div><h3 style="margin-top:0">Anteprima locandina</h3><div class="eps-preview"><canvas id="epsCanvas" width="720" height="900"></canvas></div><p class="notice">Formato verticale 4:5. L’anteprima viene salvata insieme al contenuto selezionato.</p></div></div></section></div>';
 $('epsBack').onclick=()=>window.openAdminPage?.('torneo');
 $('epsKind').value=kind;
 $('epsKind').onchange=async e=>{kind=e.target.value;selectedId='';editingRow=null;bgImage=null;existingPosterLoaded=false;layers=[];layerSeq=1;await loadTargets();await selectTarget();await renderContentFields();seedLayers();renderLayers();draw();};
 $('epsTarget').onchange=async e=>{selectedId=e.target.value;editingRow=null;bgImage=null;existingPosterLoaded=false;layers=[];layerSeq=1;await selectTarget();await renderContentFields();seedLayers();renderLayers();draw();};
 $('epsBgFile').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f){bgImage=null;existingPosterLoaded=false;draw();return;}const hadPoster=existingPosterLoaded;existingPosterLoaded=false;if(hadPoster&&!layers.length){seedLayers();renderLayers();}if(!['image/png','image/jpeg','image/webp'].includes(f.type)){setStatus('Formato non valido: usa PNG, JPG o WEBP.',true);e.target.value='';return;}if(f.size>8*1024*1024){setStatus('Immagine troppo grande: massimo 8 MB.',true);e.target.value='';return;}try{const url=await fileToDataUrl(f);const img=new Image();img.onload=()=>{bgImage=img;draw();setStatus('Sfondo caricato.');};img.onerror=()=>setStatus('Impossibile leggere lo sfondo selezionato.',true);img.src=url;}catch(err){setStatus(err.message,true);}};
 $('epsResetBg').onclick=()=>{const hadPoster=existingPosterLoaded;bgImage=null;existingPosterLoaded=false;$('epsBgFile').value='';if(hadPoster){layers=[];layerSeq=1;seedLayers();renderLayers();}draw();setStatus(hadPoster?'Sfondo Eventour ripristinato. I testi sono di nuovo modificabili.':'Sfondo Eventour ripristinato.');};
 $('epsAddText').onclick=()=>addLayer('Nuovo testo',W/2,H/2,30);
 $('epsResetText').onclick=()=>{layers=[];layerSeq=1;renderLayers();draw();};
 $('epsPublish').onclick=savePoster;
 $('epsDownload').onclick=downloadPoster;
 loadTargets().then(async()=>{await selectTarget();await renderContentFields();seedLayers();renderLayers();draw();});
}
function fileToDataUrl(file) {
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Lettura file non riuscita.'));r.readAsDataURL(file);});
}
async function loadTargets() {
 const target=$('epsTarget'); if(!target)return;
 target.innerHTML='<option value="">Caricamento…</option>';
 try {
  if(!window.aziendaId){activeRows=[];newsRows=[];marketRows=[];throw new Error('Contesto società mancante: per proteggere i dati delle aziende, seleziona prima la società da amministrare.');}
  if(kind==='torneo') {
   const client=sb();
   if(!client)throw new Error('Connessione Supabase non disponibile.');
   if(!window.aziendaId)throw new Error('Contesto società non disponibile: impossibile caricare i tornei della società corretta.');
   const res=await client.from('tornei').select('id,nome,data,data_torneo,descrizione,configurazione,stato,pubblicato,azienda_id').eq('azienda_id',window.aziendaId).eq('stato','attivo').eq('pubblicato',true).order('id',{ascending:false});
   if(res.error)throw res.error;
   activeRows=res.data||[];
   const rows=activeTournaments();
   target.innerHTML=rows.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.nome||('Torneo '+t.id))+' · '+esc(t.data_torneo||t.data||'data non indicata')+'</option>').join('')||'<option value="">Nessun torneo attivo pubblicato</option>';
   if(rows.length){selectedId=String(rows[0].id);target.value=selectedId;}
  } else if(kind==='news'||kind==='articolo') {
   const client=sb(); if(!client)throw new Error('Connessione Supabase non disponibile.');
   const res=await client.from('news').select('id,titolo,testo,immagine,locandina,pubblicata,created_at,tipo,link,in_evidenza,ordine,torneo_id,azienda_id').eq('azienda_id',window.aziendaId).order('created_at',{ascending:false});
   if(res.error)throw res.error;
   newsRows=res.data||[];
   const rows=newsRows.filter(n=>kind==='articolo'?String(n.tipo||'').toLowerCase()==='articolo':String(n.tipo||'').toLowerCase()!=='articolo');
   target.innerHTML='<option value="__new__">＋ Crea nuovo contenuto</option>'+rows.map(n=>'<option value="'+esc(n.id)+'">'+esc(n.titolo||('Contenuto '+n.id))+' · '+esc(n.tipo||'News')+'</option>').join('');
   selectedId='__new__';target.value=selectedId;
  } else if(kind==='mercatino') {
   const client=sb(); if(!client)throw new Error('Connessione Supabase non disponibile.');
   const res=await client.from('mercatino').select('*').eq('azienda_id',window.aziendaId).order('created_at',{ascending:false});
   if(res.error)throw res.error;
   marketRows=res.data||[];
   target.innerHTML='<option value="__new__">＋ Crea nuovo articolo del mercatino</option>'+marketRows.map(n=>'<option value="'+esc(n.id)+'">'+esc(n.titolo||('Articolo '+n.id))+' · '+esc(n.stato||'')+'</option>').join('');
   selectedId='__new__';target.value=selectedId;
  }
 } catch(err) {
  target.innerHTML='<option value="">Contenuti non disponibili</option>';
  setStatus('Errore caricamento contenuti: '+(err.message||err),true);
 }
}
async function loadPosterBackground(url) {
 if(!url)return false;
 return new Promise(resolve=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{bgImage=img;existingPosterLoaded=true;draw();resolve(true);};img.onerror=()=>{bgImage=null;existingPosterLoaded=false;setStatus('La locandina precedente non è stata caricata. Puoi crearne una nuova.',true);resolve(false);};img.src=url;});
}
async function selectTarget() {
 if(kind==='torneo'){
  selectedTournamentId=selectedId;
  const t=currentTournament();
  const arr=Array.isArray(cfgOf(t).news)?cfgOf(t).news:[];
  editingRow=t ? (arr.find(n=>String(n.id)==='eventour-poster-'+String(t.id)&&n?.immagine) || null) : null;
  if(editingRow?.immagine)await loadPosterBackground(editingRow.immagine);
  return;
 }
 if(selectedId==='__new__'){editingRow=null;return;}
 if(kind==='mercatino')editingRow=marketRows.find(x=>String(x.id)===String(selectedId))||null;
 else editingRow=newsRows.find(x=>String(x.id)===String(selectedId))||null;
 const posterUrl=editingRow?.locandina||'';
 if(posterUrl)await loadPosterBackground(posterUrl);
}
async function renderContentFields() {
 const box=$('epsContentFields'); if(!box)return;
 const isNew=selectedId==='__new__';
 const row=editingRow||{};
 const t=kind==='torneo'?currentTournament():null;
 const title=(row.titolo||t?.nome||'');
 const body=(row.testo||row.descrizione||t?.descrizione||'');
 let html=makeField('Titolo del contenuto','epsTitle',title,'text');
 html+='<label for="epsBody">Testo / descrizione</label><textarea id="epsBody" class="input eps-field" rows="4">'+esc(body)+'</textarea>';
 if(existingPosterLoaded)html+='<p class="notice">È stata riaperta la locandina salvata. Per ricreare i testi e modificarli singolarmente, premi “Azzera sfondo”: la grafica torna allo sfondo Eventour e i testi tornano modificabili.</p>';
 if(kind==='news'||kind==='articolo') {
  let linkedTournamentRows=[];
  try {
   const client=sb();
   if(!client)throw new Error('Connessione Supabase non disponibile.');
   if(!window.aziendaId)throw new Error('Contesto società mancante.');
   const linkedRes=await client.from('tornei').select('id,nome,stato,pubblicato,azienda_id').eq('azienda_id',window.aziendaId).eq('stato','attivo').eq('pubblicato',true).order('id',{ascending:false});
   if(linkedRes.error)throw linkedRes.error;
   linkedTournamentRows=linkedRes.data||[];
  } catch(linkedError) {
   console.error('Impossibile caricare i tornei collegabili alla news:',linkedError);
   setStatus('Non riesco a caricare i tornei della società per il collegamento. Puoi continuare a modificare il contenuto senza collegare un torneo.',true);
  }
  html+='<label for="epsLinkedTournament">Collega a un torneo (facoltativo)</label><select id="epsLinkedTournament" class="input"><option value="">News generale · nessun torneo</option>'+linkedTournamentRows.map(tn=>'<option value="'+esc(tn.id)+'">'+esc(tn.nome||('Torneo '+tn.id))+'</option>').join('')+'</select>';
  html+='<label for="epsLink">Link facoltativo</label><input id="epsLink" class="input eps-field" type="url" value="'+esc(row.link||'')+'" placeholder="https://…">';
 }
 if(kind==='mercatino'&&isNew) {
  html+='<label for="epsMarketCategory">Categoria</label><select id="epsMarketCategory" class="input"><option value="racchette">Racchette</option><option value="abbigliamento">Abbigliamento</option><option value="accessori">Accessori</option><option value="altro">Altro</option></select>';
  html+='<label for="epsMarketPrice">Prezzo</label><input id="epsMarketPrice" class="input eps-field" value="" placeholder="Es. € 35">';
  html+='<label for="epsMarketCondition">Condizioni</label><input id="epsMarketCondition" class="input eps-field" value="" placeholder="Es. Ottime condizioni">';
 }
 box.innerHTML=html;
 if(kind==='news'||kind==='articolo') {
  const linked=$('epsLinkedTournament');
  if(linked)linked.value=row.torneo_id?String(row.torneo_id):'';
 }
 $('epsTitle')?.addEventListener('input',()=>{if(layers[0]){layers[0].text=$('epsTitle').value;draw();}});
 $('epsBody')?.addEventListener('input',()=>{if(layers[1]){layers[1].text=$('epsBody').value;draw();}});
 if(kind==='torneo'&&!t) setStatus('Seleziona un torneo attivo e pubblicato.',true);
 if(kind==='torneo'&&t) setStatus('Torneo selezionato: la locandina sarà salvata direttamente nella sua configurazione.');
 if(isNew&&kind!=='torneo')setStatus('Nuovo contenuto: sarà creato e collegato alla locandina al momento del salvataggio.');
}
function seedLayers() {
 if(existingPosterLoaded)return;
 const title=$('epsTitle')?.value?.trim()||'';
 const body=$('epsBody')?.value?.trim()||'';
 if(layers.length) return;
 if(title) addLayer(title,W/2,430,44);
 if(body) addLayer(body,W/2,590,25);
}
function canvasDataUrl() {
 const canvas=$('epsCanvas');
 if(!canvas)throw new Error('Anteprima locandina non disponibile.');
 const out=document.createElement('canvas');out.width=720;out.height=900;
 out.getContext('2d').drawImage(canvas,0,0,720,900);
 let url=out.toDataURL('image/jpeg',0.78);
 if(url.length>800000)url=out.toDataURL('image/jpeg',0.55);
 if(url.length>1000000)throw new Error('La locandina è troppo pesante. Riduci la complessità dello sfondo e riprova.');
 return url;
}
async function downloadPoster() {
 try {
  await draw();
  const canvas=$('epsCanvas');if(!canvas)throw new Error('Anteprima locandina non disponibile.');
  const a=document.createElement('a');
  const title=($('epsTitle')?.value||'locandina-eventour').trim().toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi,'-').replace(/^-+|-+$/g,'')||'locandina-eventour';
  a.href=canvas.toDataURL('image/png');a.download=title+'.png';document.body.appendChild(a);a.click();a.remove();
  setStatus('Locandina PNG generata e scaricata.');
 } catch(err) { setStatus('Download non riuscito: '+(err?.message||String(err)),true); }
}
async function savePoster() {
 if(busy)return;
 if(!window.aziendaId){setStatus('Contesto società mancante: salvataggio bloccato per proteggere i dati delle aziende.',true);return;}
 const button=$('epsPublish');
 const title=$('epsTitle')?.value?.trim()||'';
 const body=$('epsBody')?.value?.trim()||'';
 if(!title){setStatus('Inserisci il titolo del contenuto.',true);return;}
 if(!layers.length&&!existingPosterLoaded){addLayer(title,W/2,430,44);}
 if(button){button.disabled=true;button.textContent='⏳ Salvataggio…';}
 busy=true;
 try {
  await draw();
  const image=canvasDataUrl();
  const client=sb(); if(!client)throw new Error('Connessione Supabase non disponibile.');
  if(kind==='torneo') {
   const t=currentTournament();
   if(!t)throw new Error('Il torneo selezionato non è più attivo o pubblicato. Ricarica l’elenco.');
   const fresh=await client.from('tornei').select('id,nome,data,data_torneo,descrizione,configurazione,azienda_id,stato,pubblicato').eq('id',t.id).eq('azienda_id',window.aziendaId).maybeSingle();
   if(fresh.error||!fresh.data)throw new Error(fresh.error?.message||'Torneo non trovato o non accessibile.');
   if(String(fresh.data.stato||'').toLowerCase()!=='attivo'||fresh.data.pubblicato!==true)throw new Error('Il torneo non risulta attivo e pubblicato.');
   const cfg=cfgOf(fresh.data),arr=Array.isArray(cfg.news)?cfg.news.slice():[];
   const posterId=editingRow?.id||'eventour-poster-'+String(t.id);
   const item={id:posterId,tipo:'Locandina',titolo:title,testo:body,link:'tabellone.html?idTorneo='+encodeURIComponent(t.id)+(window.aziendaId?'&azienda_id='+encodeURIComponent(window.aziendaId):''),immagine:image,inEvidenza:true,pubblicataVisitatore:true,data:new Date().toISOString(),ordine:0,aiMode:'central-poster'};
   const next=arr.slice();
   const ix=next.findIndex(n=>String(n.id)===posterId);
   if(ix>=0)next.splice(ix,1);
   next.unshift(item);
   const write=await client.from('tornei').update({configurazione:Object.assign({},cfg,{news:next})}).eq('id',t.id).eq('azienda_id',window.aziendaId).select('id,configurazione').maybeSingle();
   if(write.error||!write.data)throw new Error(write.error?.message||'Salvataggio locandina del torneo non riuscito.');
   const savedCfg=cfgOf(write.data);
   if(!Array.isArray(savedCfg.news)||!savedCfg.news.some(n=>String(n.id)===posterId&&n.immagine))throw new Error('Verifica fallita: la locandina non è presente nella configurazione del torneo.');
   t.configurazione=savedCfg;
   setStatus('Locandina salvata e collegata al torneo "'+title+'".');
  } else if(kind==='news'||kind==='articolo') {
   const linked=$('epsLinkedTournament')?.value||null;
   const link=$('epsLink')?.value?.trim()||null;
   const existing=editingRow;
   if(!window.aziendaId)throw new Error('Contesto società mancante: salvataggio bloccato per proteggere i dati delle aziende.');
   if(linked) {
    const linkedCheck=await client.from('tornei').select('id').eq('id',linked).eq('azienda_id',window.aziendaId).eq('stato','attivo').eq('pubblicato',true).maybeSingle();
    if(linkedCheck.error||!linkedCheck.data)throw new Error(linkedCheck.error?.message||'Il torneo selezionato non appartiene alla società corrente o non è attivo e pubblicato.');
   }
   const payload={titolo:title,testo:body,immagine:existing?.immagine||null,locandina:image,pubblicata:true,tipo:kind==='articolo'?'Articolo':(existing?.tipo||'Comunicazione'),link,in_evidenza:existing?.in_evidenza||false,ordine:existing?.ordine||0,torneo_id:linked||null,azienda_id:window.aziendaId};
   let result;
   if(existing?.id)result=await client.from('news').update(payload).eq('id',existing.id).eq('azienda_id',window.aziendaId).select('id,titolo,torneo_id').maybeSingle();
   else result=await client.from('news').insert(payload).select('id,titolo,torneo_id').single();
   if(result.error||!result.data)throw new Error(result.error?.message||'Salvataggio del contenuto e della locandina non riuscito.');
   const verifyNews=await client.from('news').select('id,titolo,locandina,torneo_id,azienda_id').eq('id',result.data.id).eq('azienda_id',window.aziendaId).maybeSingle();
   if(verifyNews.error||!verifyNews.data||!verifyNews.data.locandina)throw new Error(verifyNews.error?.message||'Verifica fallita: la locandina non risulta salvata nel contenuto della società.');
   if(String(verifyNews.data.torneo_id||'')!==String(linked||''))throw new Error('La locandina è stata salvata, ma il collegamento al torneo non coincide con quello selezionato. Verifica il contenuto prima di riprovare.');
   editingRow=Object.assign({},existing||{},payload,{id:result.data.id,locandina:verifyNews.data.locandina});
   newsRows=newsRows.filter(n=>String(n.id)!==String(result.data.id));newsRows.unshift(editingRow);
   chooseSavedTarget(result.data.id,title);
   setStatus('Contenuto pubblicato e locandina collegata. ID contenuto: '+result.data.id+'.');
  } else if(kind==='mercatino') {
   const existing=editingRow;
   let rowId=existing?.id||null;
   if(!rowId) {
    const userResult=await client.auth.getUser();
    const user=userResult?.data?.user;
    const cat=$('epsMarketCategory')?.value||'altro';
    const price=$('epsMarketPrice')?.value?.trim()||'';
    const condition=$('epsMarketCondition')?.value?.trim()||'';
    const payload={titolo,descrizione:body,anteprima:body.slice(0,180),categoria:cat,categoria_label:({racchette:'Racchette',abbigliamento:'Abbigliamento',accessori:'Accessori',altro:'Altro'})[cat]||'Altro',prezzo:price,condizioni:condition,immagine:'',locandina:image,stato:'disponibile',pubblicato:true,created_by:user?.id||null,contatto:''};
    const ins=await client.from('mercatino').insert(Object.assign({},payload,{azienda_id:window.aziendaId})).select('id,titolo').single();
    if(ins.error||!ins.data)throw new Error(ins.error?.message||'Creazione articolo del mercatino non riuscita.');
    rowId=ins.data.id;
    editingRow=Object.assign({},payload,{id:rowId});marketRows.unshift(editingRow);chooseSavedTarget(rowId,title);await renderContentFields();
   } else {
    const upd=await client.from('mercatino').update({titolo,descrizione:body,anteprima:body.slice(0,180),locandina:image,updated_at:new Date().toISOString()}).eq('id',rowId).eq('azienda_id',window.aziendaId).select('id,titolo').maybeSingle();
    if(upd.error||!upd.data)throw new Error(upd.error?.message||'Locandina non collegata all’articolo del mercatino.');
    editingRow=Object.assign({},existing,{titolo,descrizione:body,anteprima:body.slice(0,180),locandina:image,updated_at:new Date().toISOString()});
    marketRows=marketRows.map(n=>String(n.id)===String(rowId)?editingRow:n);chooseSavedTarget(rowId,title);
   }
   const verify=await client.from('mercatino').select('id,locandina').eq('id',rowId).eq('azienda_id',window.aziendaId).maybeSingle();
   if(verify.error||!verify.data||!verify.data.locandina)throw new Error(verify.error?.message||'Verifica del collegamento alla locandina non riuscita.');
   setStatus('Locandina salvata e collegata all’articolo del mercatino "'+title+'". ID articolo: '+rowId+'.');
  }
 } catch(err) {
  console.error('Creazione Locandine & Articoli:',err);
  setStatus('Salvataggio non riuscito: '+(err?.message||String(err)),true);
 } finally {
  busy=false;
  if(button){button.disabled=false;button.textContent='💾 Salva e collega la locandina';}
 }
}
function openStudio() {
 const root=$('appContent');
 if(!root) {
  console.error('Creazione Locandine & Articoli: contenitore #appContent non disponibile.');
  window.alert('Impossibile aprire l’editor: la schermata amministrativa non è pronta. Ricarica la pagina e riprova.');
  return;
 }
 const overlay=$('mobileOverlay');overlay?.classList.remove('open');
 kind='torneo';selectedId='';selectedTournamentId='';editingRow=null;bgImage=null;existingPosterLoaded=false;activeRows=null;newsRows=[];marketRows=[];layers=[];layerSeq=1;
 try {
  renderStudio();
  if(!$('eventourPosterStudio'))throw new Error('L’interfaccia dell’editor non è stata creata.');
 } catch(err) {
  console.error('Apertura Creazione Locandine & Articoli non riuscita:',err);
  window.alert('L’editor delle locandine non si è aperto: '+(err?.message||String(err)));
 }
}
window.openEventourContentStudio=openStudio;
/* Routing prioritario sul window capture: viene eseguito prima dei listener document
   del bootstrap, che in precedenza potevano interrompere il click prima dei listener
   del pulsante. Gestisce esclusivamente i due pulsanti Locandine & Articoli. */
window.addEventListener('click',function(event){
 const button=event.target?.closest?.('#sideLocandineArticles, #mobileLocandineArticles');
 if(!button)return;
 event.preventDefault();
 event.stopPropagation();
 event.stopImmediatePropagation();
 document.getElementById('mobileOverlay')?.classList.remove('open');
 try{openStudio();}
 catch(error){
  console.error('Apertura editor Eventour non riuscita:',error);
  window.alert('Impossibile aprire l’editor Locandine & Articoli: '+(error?.message||String(error)));
 }
},true);
const bindStudioButton=id=>{
 const b=$(id);
 if(!b||b.dataset.epsOpenBound==='1')return;
 b.dataset.epsOpenBound='1';
 b.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  openStudio();
 });
};
const bindStudioButtons=()=>{
 bindStudioButton('sideLocandineArticles');
 bindStudioButton('mobileLocandineArticles');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindStudioButtons,{once:true});
else bindStudioButtons();
window.openAdminComPage=(function(previous){return function(page,...args){if(page==='news'||page==='news-ai'||page==='locandine'||page==='poster-studio'){openStudio();return;}return previous?.call(this,page,...args);};})(window.openAdminComPage);
})();
