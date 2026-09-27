(()=>{'use strict';
const S=()=>window.sb||window.supabaseClient;
const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const tenantId=()=>String(window.aziendaId||'').trim();
const isGlobal=()=>window.isSuperadmin===true || window.adminRuolo==='admin' && !tenantId();
async function loadPrivacyAdmin(){
 const root=document.getElementById('appContent');const sb=S();if(!root||!sb)return;
 let aziende=[];
 if(isGlobal()){
   const r=await sb.from('aziende').select('id,ragione_sociale,nome_app,titolare,sede,cf_piva,email,pec,dpo,privacy_text,cookie_text,termini_text').order('ragione_sociale',{ascending:true});
   if(r.error){root.innerHTML='<div class="card"><div class="card-body"><div class="empty">Impossibile caricare le società.</div></div></div>';console.error(r.error);return}
   aziende=r.data||[];
 }else{
   const id=tenantId();
   if(!id){root.innerHTML='<div class="card"><div class="card-body"><div class="empty">Società non associata all\'account.</div></div></div>';return}
   const r=await sb.from('aziende').select('id,ragione_sociale,nome_app,titolare,sede,cf_piva,email,pec,dpo,privacy_text,cookie_text,termini_text').eq('id',id).maybeSingle();
   if(r.error||!r.data){root.innerHTML='<div class="card"><div class="card-body"><div class="empty">Impossibile caricare i dati Privacy della società.</div></div></div>';console.error(r.error);return}
   aziende=[r.data];
 }
 if(!aziende.length){root.innerHTML='<div class="card"><div class="card-body"><div class="empty">Nessuna società disponibile.</div></div></div>';return}
 root.innerHTML='<div class="page-head"><div><h1>🔐 Privacy e documenti legali</h1><p>Dati e testi della società pubblicati nelle pagine Privacy, Cookie e Termini.</p></div></div><div class="card"><div class="card-head"><h2>Società</h2><span class="notice">I dati sono separati per azienda</span></div><div class="card-body"><div class="field">'+(aziende.length>1?'<label>SOCIETÀ</label><select id="privacyCompany">'+aziende.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.ragione_sociale||a.nome_app||a.id)+'</option>').join('')+'</select>':'<strong id="privacyCompanyLabel">'+esc(aziende[0].ragione_sociale||aziende[0].nome_app||'Società')+'</strong>')+'</div><div id="privacyFields"></div></div></div>';
 const select=document.getElementById('privacyCompany');
 const render=a=>{
   document.getElementById('privacyFields').innerHTML='<div class="section-grid"><div class="field"><label>TITOLARE / RAGIONE SOCIALE</label><input id="privacyTitolare" value="'+esc(a.titolare||a.ragione_sociale)+'"></div><div class="field"><label>SEDE</label><input id="privacySede" value="'+esc(a.sede)+'"></div><div class="field"><label>CODICE FISCALE / P.IVA</label><input id="privacyCfPiva" value="'+esc(a.cf_piva)+'"></div><div class="field"><label>E-MAIL PRIVACY</label><input id="privacyEmail" type="email" value="'+esc(a.email)+'"></div><div class="field"><label>PEC</label><input id="privacyPec" value="'+esc(a.pec)+'"></div><div class="field"><label>DPO / RPD</label><input id="privacyDpo" value="'+esc(a.dpo)+'"></div><div class="field" style="grid-column:1/-1"><label>INFORMATIVA PRIVACY</label><textarea id="privacyText" rows="10" style="width:100%;resize:vertical">'+esc(a.privacy_text)+'</textarea></div><div class="field" style="grid-column:1/-1"><label>COOKIE POLICY</label><textarea id="cookieText" rows="8" style="width:100%;resize:vertical">'+esc(a.cookie_text)+'</textarea></div><div class="field" style="grid-column:1/-1"><label>TERMINI E CONDIZIONI</label><textarea id="termsText" rows="8" style="width:100%;resize:vertical">'+esc(a.termini_text)+'</textarea></div></div><div class="list-actions" style="margin-top:18px"><button class="btn primary" id="savePrivacy">💾 Salva documenti legali</button><button class="btn" id="openPrivacy">👁️ Apri Privacy</button></div><p class="notice" style="margin-top:14px">Ogni società modifica esclusivamente i propri dati. I documenti pubblici vengono letti dalla scheda della società.</p>';
   document.getElementById('savePrivacy').onclick=async()=>{
     const payload={titolare:document.getElementById('privacyTitolare').value.trim(),sede:document.getElementById('privacySede').value.trim(),cf_piva:document.getElementById('privacyCfPiva').value.trim(),email:document.getElementById('privacyEmail').value.trim(),pec:document.getElementById('privacyPec').value.trim(),dpo:document.getElementById('privacyDpo').value.trim(),privacy_text:document.getElementById('privacyText').value, cookie_text:document.getElementById('cookieText').value, termini_text:document.getElementById('termsText').value,updated_at:new Date().toISOString()};
     if(!payload.titolare||!payload.sede||!payload.cf_piva||!payload.email){alert('Compila almeno Titolare, sede, CF/P.IVA ed e-mail Privacy.');return}
     const id=select?select.value:a.id;
     const result=await sb.from('aziende').update(payload).eq('id',id);
     if(result.error){console.error(result.error);alert('Salvataggio non riuscito: '+result.error.message);return}
     alert('✅ Dati Privacy e documenti legali salvati per la società selezionata.');
     await loadPrivacyAdmin();
   };
   document.getElementById('openPrivacy').onclick=()=>window.open('privacy.html?azienda='+encodeURIComponent(a.slug||''),'_blank','noopener');
 };
 if(select){select.onchange=()=>render(aziende.find(a=>a.id===select.value)||aziende[0]);}
 render(aziende[0]);
}
window.openAdminPrivacy=loadPrivacyAdmin;
})();