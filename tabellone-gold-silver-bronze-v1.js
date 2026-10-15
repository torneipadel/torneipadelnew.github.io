/* Formula dedicata: 9 squadre, 3 gironi da 3, finali Gold/Silver/Bronze.
 * Non modifica il flusso delle altre formule. I risultati restano nello snapshot
 * completo del torneo e vengono salvati da updateAndSync() su Supabase.
 */
(function(){
'use strict';
const baseEnsureRules=window.ensureRules;
const baseOpenRules=window.openRules;
const baseApplyRules=window.applyRules;
const baseUpdateDescription=window.aggiornaDescrizioneTipoTorneo;
const baseRender=window.render;
const baseRenderKO=window.renderKO;
const baseSetFormat=window.setFormat;
const baseApplyModel=window.applicaModelloTorneo;
const groups=['A','B','C'];
const stages=[
  {key:'gold',title:'🥇 GOLD — Finale per il 1° posto',position:1,court:1},
  {key:'silver',title:'🥈 SILVER — Finale per il 2° posto',position:2,court:2},
  {key:'bronze',title:'🥉 BRONZE — Finale per il 3° posto',position:3,court:3}
];
const pairs=[[0,1],[0,2],[1,2]];
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const specialValues=new Set(['goldSilverBronze','gironiGoldSilverBronze','gold_silver_bronze']);
function isSpecial(){
  const selector=document.getElementById('tipoTorneo');
  if(selector&&selector.value&&selector.value!=='goldSilverBronze')return false;
  const r=window.state?.rules;
  const s=typeof state!=='undefined'?state:null;
  const rules=s?.rules||r||{};
  return [s?.formula,s?.formulaTorneo,rules.tipoTorneo,rules.formulaScelta,rules.formulaFinale,rules.formulaConfig?.formula]
    .some(v=>specialValues.has(String(v||'')));
}
window.isGoldSilverBronzeTournament=isSpecial;
function activeState(){return typeof state!=='undefined'?state:null}
function configureRules(){
  const s=activeState(); if(!s)return;
  const r=s.rules&&typeof s.rules==='object'?s.rules:{};
  Object.assign(r,{
    tipoTorneo:'goldSilverBronze',
    formatoTorneo:9,
    numeroSquadre:9,
    numeroGironi:3,
    squadrePerGirone:3,
    formulaGironi:'tuttiControTutti',
    formulaFinale:'goldSilverBronze',
    formulaScelta:'goldSilverBronze',
    qualificatePerGirone:3,
    numeroQualificateFinali:9,
    usaQuarti:false,
    usaSemifinali:false,
    usaFinale:false,
    garaAndataRitorno:false,
    w:Number.isFinite(Number(r.w))?Number(r.w):3,
    d:Number.isFinite(Number(r.d))?Number(r.d):1,
    l:Number.isFinite(Number(r.l))?Number(r.l):0,
    crit1:r.crit1||'scontroDiretto',
    crit2:r.crit2||'df',
    crit3:r.crit3||'gf',
    start:String(r.start||'20:00'),
    duration:Number.isFinite(Number(r.duration))&&Number(r.duration)>0?Number(r.duration):20,
    note:String(r.note||""),
    campi:3
  });
  r.criteriClassifica=['pt',r.crit1,r.crit2,r.crit3];
  r.formulaConfig={...(r.formulaConfig||{}),formula:'goldSilverBronze',numeroGironi:3,squadrePerGirone:3,campi:3,durata:r.duration,oraInizio:r.start,note:r.note,puntiVittoria:r.w,puntiPareggio:r.d,puntiSconfitta:r.l,crit1:r.crit1,crit2:r.crit2,crit3:r.crit3,qualificatePerGirone:3,numeroQualificateFinali:9,usaQuarti:false,usaSemifinali:false,usaFinale:false};
  s.rules=r;
  s.formato=9;
}
window.ensureRules=function(){
  if(isSpecial()){configureRules();return activeState()?.rules||{}}
  return typeof baseEnsureRules==='function'?baseEnsureRules.apply(this,arguments):undefined;
};
function teamName(v){
  if(typeof v==='string')return v.trim();
  if(!v||typeof v!=='object')return '';
  if(v.nome)return String(v.nome).trim();
  if(v.g1&&v.g2)return String(v.g1).trim()+' / '+String(v.g2).trim();
  if(v.giocatore1&&v.giocatore2)return String(v.giocatore1).trim()+' / '+String(v.giocatore2).trim();
  return String(v.nome_squadra||v.nomeSquadra||'').trim();
}
function validScore(v){return /^\s*\d+\s*-\s*\d+\s*$/.test(String(v??''))}
function normalizedResults(v){return Array.from({length:3},(_,i)=>validScore(v?.[i])?String(v[i]).replace(/\s/g,''):'-')}
function normalizeTeams(){
  const s=activeState();if(!s||!isSpecial())return;
  configureRules();
  const source=Array.isArray(s.coppie)?s.coppie.map(teamName).filter(Boolean):[];
  const current=groups.flatMap(g=>Array.isArray(s[g])?s[g].map(teamName):[]).filter(Boolean);
  const balanced=groups.every(g=>Array.isArray(s[g])&&s[g].length===3&&s[g].every(x=>String(teamName(x)||'').trim()));
  if(source.length===9 && (!balanced||current.length!==9)){
    groups.forEach((g,i)=>{s[g]=source.slice(i*3,(i+1)*3);s[g+'res']=Array(3).fill('-');s[g+'time']=Array(3).fill('');s[g+'camp']=Array(3).fill('')});
  }else{
    groups.forEach(g=>{if(!Array.isArray(s[g]))s[g]=[]});
  }
  ['D','E','F','G'].forEach(g=>{s[g]=[];s[g+'res']=[];s[g+'time']=[];s[g+'camp']=[]});
  groups.forEach(g=>{
    if(!Array.isArray(s[g+'res'])||s[g+'res'].length!==3)s[g+'res']=Array(3).fill('-');
    if(!Array.isArray(s[g+'time'])||s[g+'time'].length!==3)s[g+'time']=Array(3).fill('');
    if(!Array.isArray(s[g+'camp'])||s[g+'camp'].length!==3)s[g+'camp']=Array(3).fill('');
  });
  const saved=s.goldSilverBronze?.results||{};
  ['gold','silver','bronze'].forEach(k=>{
    const key=k+'Res';
    if(!Array.isArray(s[key])||s[key].length!==3)s[key]=normalizedResults(saved[k]);
  });
  if(!s.goldSilverBronze||typeof s.goldSilverBronze!=='object')s.goldSilverBronze={version:1,teamsPerGroup:3,groupCount:3,courts:3,matchDurationMinutes:20,groupMatchCount:9,finalMatchCount:9,finals:['gold','silver','bronze'],results:{}};
  s.goldSilverBronze.results=s.goldSilverBronze.results||{};
  ['gold','silver','bronze'].forEach(k=>s.goldSilverBronze.results[k]=normalizedResults(s[k+'Res']));
}
function standings(tag){
  const s=activeState(),teams=s?.[tag],results=s?.[tag+'res'];
  if(!Array.isArray(teams)||teams.length!==3)return [];
  const safe=normalizedResults(results);
  return typeof calc==='function'?calc(teams,safe):[];
}
function groupsComplete(){
  const s=activeState();
  return !!s&&groups.every(g=>Array.isArray(s[g])&&s[g].length===3&&s[g].every(x=>String(x||'').trim())&&normalizedResults(s[g+'res']).every(validScore));
}
function finalTeams(stage){
  const s=activeState();
  if(!groupsComplete())return [];
  return groups.map(g=>standings(g)[stage.position-1]?.n||'');
}
function timeAt(offset){
  const s=activeState(),r=s?.rules||{},parts=String(r.start||'20:00').split(':');
  let total=(Number(parts[0])||0)*60+(Number(parts[1])||0)+offset;
  total=((total%1440)+1440)%1440;
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
function finalStandingsHtml(stage,teams){
  if(teams.length!==3||teams.some(x=>!x))return '<p class="gsb-muted">La classifica sarà disponibile dopo aver completato tutti i risultati dei tre gironi iniziali.</p>';
  const s=activeState(),scores=normalizedResults(s[stage.key+'Res']);
  const rank=typeof calc==='function'?calc(teams,scores):[];
  const complete=scores.every(validScore);
  return '<h4>'+(complete?'Classifica finale':'Classifica provvisoria')+'</h4><table class="gsb-standing"><thead><tr><th>Pos.</th><th>Squadra</th><th>PT</th><th>GF</th><th>GS</th><th>DG</th></tr></thead><tbody>'+
    rank.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(teamName(x.n))+'</td><td>'+x.pt+'</td><td>'+x.gf+'</td><td>'+x.gs+'</td><td>'+x.df+'</td></tr>').join('')+
    '</tbody></table>';
}
function renderCustomFinals(){
  if(!isSpecial())return;
  normalizeTeams();
  const s=activeState();if(!s)return;
  const legacy=document.querySelector('.finalContainer');if(legacy)legacy.style.display='none';
  const formulaBox=document.getElementById('formulaTorneoBox');if(formulaBox)formulaBox.style.display='none';
  let host=document.getElementById('goldSilverBronzeStage');
  if(!host){
    host=document.createElement('section');host.id='goldSilverBronzeStage';
    host.style.cssText='margin:22px 0;padding:18px;border:1px solid rgba(234,179,8,.55);border-radius:16px;background:rgba(15,23,42,.88);color:#f8fafc';
    if(legacy?.parentNode)legacy.parentNode.insertBefore(host,legacy);
    else document.querySelector('.container')?.appendChild(host);
  }
  const ready=groupsComplete();
  let html='<h2 style="text-align:center;margin-top:0">🥇🥈🥉 Fase finale — Gold / Silver / Bronze</h2>'+
    '<p style="text-align:center">Le 3 prime classificate dei gironi disputano Gold; le 3 seconde Silver; le 3 terze Bronze. Ogni fascia è un girone all’italiana: 3 partite.</p>'+
    '<p style="text-align:center">Classifica: punti (vittoria '+Number(s.rules.w)+', pareggio '+Number(s.rules.d)+', sconfitta '+Number(s.rules.l)+') → '+esc(s.rules.crit1)+' → '+esc(s.rules.crit2)+' → '+esc(s.rules.crit3)+'.</p>'+
    (ready?'<p class="gsb-ready">Tutti i gironi iniziali sono completati: le finali sono abilitate.</p>':'<p class="gsb-wait">Le finali si sbloccano quando tutte le 9 partite dei gironi iniziali hanno un risultato valido.</p>');
  stages.forEach(stage=>{
    const teams=finalTeams(stage);
    const labels=ready?teams:groups.map(g=>stage.position+'ª classificata Girone '+g+' — da definire');
    const scores=normalizedResults(s[stage.key+'Res']);
    html+='<div class="gsb-final-card gsb-'+stage.key+'"><h3>'+stage.title+'</h3>'+
      '<p class="gsb-subtitle">Campo '+stage.court+' · Partite da '+Number(s.rules.duration||20)+' minuti · '+(ready?'Classifica determinata dai risultati dei gironi':'In attesa delle classifiche dei gironi')+'</p>'+
      '<table class="gsb-matches"><thead><tr><th>Turno</th><th>Ora</th><th>Campo</th><th>Incontro</th><th>Risultato</th></tr></thead><tbody>';
    pairs.forEach((pair,i)=>{
      const score=scores[i].split('-');
      const disabled=ready?'':' disabled';
      html+='<tr><td>'+(i+1)+'</td><td>'+timeAt((3+i)*Number(s.rules.duration||20))+'</td><td>'+stage.court+'</td><td>'+esc(teamName(labels[pair[0]]))+' <b>vs</b> '+esc(teamName(labels[pair[1]]))+'</td><td><div class="gsb-score">'+
        '<input type="number" min="0" step="1" aria-label="Risultato '+stage.key+' partita '+(i+1)+' squadra 1" value="'+(score[0]==='-'?'':esc(score[0]))+'"'+disabled+' oninput="window.updateGoldSilverBronzeScore(\''+stage.key+'\','+i+',0,this.value)">'+
        '<span>–</span><input type="number" min="0" step="1" aria-label="Risultato '+stage.key+' partita '+(i+1)+' squadra 2" value="'+esc(score[1]||'')+'"'+disabled+' oninput="window.updateGoldSilverBronzeScore(\''+stage.key+'\','+i+',1,this.value)">'+
        '</div></td></tr>';
    });
    html+='</tbody></table><div id="gsb-standings-'+stage.key+'">'+finalStandingsHtml(stage,teams)+'</div></div>';
  });
  html+='<p class="gsb-total"><b>Riepilogo:</b> 9 partite nei gironi + 9 partite nelle finali = 18 partite. Con 3 campi e turni da '+Number(s.rules.duration||20)+' minuti: 6 turni = '+(6*Number(s.rules.duration||20))+' minuti teorici, escluse pause e cambi.</p>';
  host.innerHTML=html;
}
function updateFinalStandings(stageKey){
  const stage=stages.find(x=>x.key===stageKey);if(!stage)return;
  const box=document.getElementById('gsb-standings-'+stageKey);if(!box)return;
  box.innerHTML=finalStandingsHtml(stage,finalTeams(stage));
}
window.updateGoldSilverBronzeScore=function(stageKey,index,side,value){
  if(!isSpecial())return;
  const s=activeState();if(!s||!stages.some(x=>x.key===stageKey))return;
  const key=stageKey+'Res';
  if(!Array.isArray(s[key])||s[key].length!==3)s[key]=Array(3).fill('-');
  const raw=String(s[key][index]??'-');const parts=raw.includes('-')?raw.split('-'):['',''];if(parts.length!==2){parts[0]='';parts[1]=''}
  parts[side]=String(value??'').trim();
  s[key][index]=parts.every(x=>x==='')?'-':parts.join('-');
  s.goldSilverBronze=s.goldSilverBronze||{version:1,results:{}};
  s.goldSilverBronze.results=s.goldSilverBronze.results||{};
  s.goldSilverBronze.results[stageKey]=[...s[key]];
  updateFinalStandings(stageKey);
  if(typeof window.updateAndSync==='function')window.updateAndSync();
};


window.aggiornaDescrizioneTipoTorneo=function(){
  const selector=document.getElementById('tipoTorneo');
  const box=document.getElementById('descrizioneTipoTorneo');
  if((isSpecial()||selector?.value==='goldSilverBronze')&&box){
    box.innerHTML='🥇🥈🥉 <b>Gironi + Finali Gold/Silver/Bronze</b><br><br>9 squadre in 3 gironi da 3. Ogni girone all’italiana disputa 3 partite. Le prime classificate accedono alla Gold, le seconde alla Silver, le terze alla Bronze. Ogni fascia disputa 3 partite all’italiana. Totale 18 partite, 3 campi, 20 minuti a partita.<br><br><b>Punteggi:</b> vittoria 3, pareggio 1, sconfitta 0.<br><b>Spareggi:</b> scontro diretto, differenza giochi, giochi vinti.';
    return;
  }
  if(typeof baseUpdateDescription==='function')return baseUpdateDescription.apply(this,arguments);
};

function addRuleOption(id,value,label){
  const select=document.getElementById(id);if(!select)return;
  if(!Array.from(select.options||[]).some(option=>option.value===String(value))){
    const option=document.createElement('option');option.value=String(value);option.textContent=label;select.appendChild(option);
  }
}
function prepareSpecialRuleOptions(){
  addRuleOption('formatoTorneo',9,'9 squadre — Gold/Silver/Bronze');
  addRuleOption('tipoTorneo','goldSilverBronze','🥇🥈🥉 Gironi + Finali Gold/Silver/Bronze');
  addRuleOption('formulaFinale','goldSilverBronze','Gironi finali Gold/Silver/Bronze');
}
function setRuleField(id,value){
  const el=document.getElementById(id);if(el)el.value=String(value??'');
}
function setSpecialRuleFields(){
  configureRules();
  const s=activeState(),r=s?.rules;if(!r)return;
  setRuleField('formatoTorneo',9);setRuleField('tipoTorneo','goldSilverBronze');
  setRuleField('numeroSquadre',9);setRuleField('numeroGironi',3);setRuleField('squadrePerGirone',3);
  setRuleField('formulaGironi','tuttiControTutti');setRuleField('formulaFinale','goldSilverBronze');
  setRuleField('wP',r.w);setRuleField('dP',r.d);setRuleField('lP',r.l);
  setRuleField('crit1',r.crit1);setRuleField('crit2',r.crit2);setRuleField('crit3',r.crit3);
  setRuleField('startTime',r.start);setRuleField('duration',r.duration);setRuleField('noteRegole',r.note||'');
  setRuleField('qualificatePerGirone',3);setRuleField('numeroQualificateFinali',9);
  ['formatoTorneo','numeroGironi','squadrePerGirone'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=true;});
}
window.openRules=function(){
  const special=isSpecial();
  // La formula 9 squadre deve essere selezionabile anche partendo da un torneo standard.
  prepareSpecialRuleOptions();
  const result=typeof baseOpenRules==='function'?baseOpenRules.apply(this,arguments):undefined;
  if(special)setSpecialRuleFields();
  else ['formatoTorneo','numeroGironi','squadrePerGirone'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});
  return result;
};
window.applyRules=function(){
  const selected=document.getElementById('tipoTorneo')?.value||'';
  if(!isSpecial()&&selected!=='goldSilverBronze'){
    return typeof baseApplyRules==='function'?baseApplyRules.apply(this,arguments):undefined;
  }
  const s=activeState();if(!s)return false;
  const readNumber=(id,fallback)=>{const el=document.getElementById(id);return el&&el.value!==''?Number(el.value):fallback;};
  const n=readNumber('formatoTorneo',9),g=readNumber('numeroGironi',3),per=readNumber('squadrePerGirone',3);
  if(n!==9||g!==3||per!==3){alert('La formula Gold/Silver/Bronze richiede 9 squadre in 3 gironi da 3. Ripristina questi valori per salvare le regole.');return false;}
  configureRules();const r=s.rules;
  r.w=readNumber('wP',r.w);r.d=readNumber('dP',r.d);r.l=readNumber('lP',r.l);
  ['crit1','crit2','crit3'].forEach(id=>{const el=document.getElementById(id);if(el)r[id]=el.value||r[id];});
  r.start=document.getElementById('startTime')?.value||r.start||'20:00';
  r.duration=Math.max(1,readNumber('duration',r.duration||20));
  r.note=document.getElementById('noteRegole')?.value||'';
  r.campi=3;r.numeroSquadre=9;r.formatoTorneo=9;r.numeroGironi=3;r.squadrePerGirone=3;
  r.tipoTorneo='goldSilverBronze';r.formulaScelta='goldSilverBronze';r.formulaGironi='tuttiControTutti';r.formulaFinale='goldSilverBronze';
  r.qualificatePerGirone=3;r.numeroQualificateFinali=9;r.usaQuarti=false;r.usaSemifinali=false;r.usaFinale=false;
  r.criteriClassifica=['pt',r.crit1,r.crit2,r.crit3];r.garaAndataRitorno=false;r.locked=false;r.formulaConfig={...(r.formulaConfig||{}),formula:'goldSilverBronze',numeroGironi:3,squadrePerGirone:3,campi:3,durata:r.duration,oraInizio:r.start,note:r.note,puntiVittoria:r.w,puntiPareggio:r.d,puntiSconfitta:r.l,crit1:r.crit1,crit2:r.crit2,crit3:r.crit3,qualificatePerGirone:3,numeroQualificateFinali:9,usaQuarti:false,usaSemifinali:false,usaFinale:false};s.rules=r;s.formato=9;
  if(typeof window.renderTables==='function')window.renderTables();
  if(typeof window.renderClass==='function')window.renderClass();
  if(typeof window.renderKO==='function')window.renderKO();
  if(typeof window.updateAndSync==='function')window.updateAndSync();
  const modal=document.getElementById('rulesModal');if(modal)modal.style.display='none';
  return true;
};

const style=document.createElement('style');
style.textContent='#goldSilverBronzeStage .gsb-final-card{margin:18px 0;padding:14px;border:1px solid #475569;border-radius:12px;background:rgba(30,41,59,.72)}#goldSilverBronzeStage .gsb-final-card h3{text-align:center;margin:0 0 8px}#goldSilverBronzeStage .gsb-subtitle,#goldSilverBronzeStage .gsb-muted{color:#cbd5e1;text-align:center}#goldSilverBronzeStage .gsb-ready{padding:10px;border-radius:8px;text-align:center;background:rgba(22,163,74,.16);color:#bbf7d0}#goldSilverBronzeStage .gsb-wait{padding:10px;border-radius:8px;text-align:center;background:rgba(217,119,6,.16);color:#fde68a}#goldSilverBronzeStage table{width:100%;border-collapse:collapse;margin:10px 0}#goldSilverBronzeStage th,#goldSilverBronzeStage td{padding:8px;border-bottom:1px solid #475569;text-align:center}#goldSilverBronzeStage .gsb-score{display:flex;justify-content:center;align-items:center;gap:7px}#goldSilverBronzeStage .gsb-score input{width:54px;max-width:24%;text-align:center}#goldSilverBronzeStage .gsb-standing{max-width:680px;margin:12px auto}#goldSilverBronzeStage .gsb-total{padding:12px;border-top:1px solid #475569;text-align:center}@media(max-width:700px){#goldSilverBronzeStage{padding:10px!important}#goldSilverBronzeStage .gsb-final-card{padding:7px}#goldSilverBronzeStage th,#goldSilverBronzeStage td{padding:5px 3px;font-size:12px}}';
(document.head||document.documentElement).appendChild(style);
window.ensureRules=window.ensureRules;
window.renderKO=function(){
  if(isSpecial()){renderCustomFinals();return}
  return typeof baseRenderKO==='function'?baseRenderKO.apply(this,arguments):undefined;
};
window.render=function(){
  if(isSpecial()){configureRules();normalizeTeams()}
  const result=typeof baseRender==='function'?baseRender.apply(this,arguments):undefined;
  if(isSpecial())renderCustomFinals();
  return result;
};
window.setFormat=function(n){
  if(isSpecial()){
    alert('La formula Gold/Silver/Bronze richiede 9 squadre, 3 gironi da 3, 3 campi e partite da 20 minuti. Per cambiare formula, crea un nuovo torneo con la formula desiderata.');
    return false;
  }
  return typeof baseSetFormat==='function'?baseSetFormat.apply(this,arguments):undefined;
};
window.applicaModelloTorneo=function(){
  const selected=document.getElementById('tipoTorneo')?.value||'';
  if(selected&&selected!=='goldSilverBronze'){
    ['formatoTorneo','numeroGironi','squadrePerGirone'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=false;});
    const formato=document.getElementById('formatoTorneo');if(formato&&Number(formato.value)===9)formato.value='8';
    return typeof baseApplyModel==='function'?baseApplyModel.apply(this,arguments):undefined;
  }
  if(isSpecial()||selected==='goldSilverBronze'){
    prepareSpecialRuleOptions();setSpecialRuleFields();renderCustomFinals();return false;
  }
  return typeof baseApplyModel==='function'?baseApplyModel.apply(this,arguments):undefined;
};
})();