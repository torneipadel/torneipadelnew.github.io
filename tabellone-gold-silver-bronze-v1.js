/* Formula dedicata: 9 squadre, 3 gironi da 3, finali Gold/Silver/Bronze.
 * Non modifica il flusso delle altre formule. I risultati restano nello snapshot
 * completo del torneo e vengono salvati da updateAndSync() su Supabase.
 */
(function(){
'use strict';
const baseEnsureRules=window.ensureRules;
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
    duration:20,
    campi:3
  });
  r.criteriClassifica=['pt',r.crit1,r.crit2,r.crit3];
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
  if(source.length===9 && current.length!==9){
    groups.forEach((g,i)=>{s[g]=source.slice(i*3,(i+1)*3)});
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
      '<p class="gsb-subtitle">Campo '+stage.court+' · Partite da 20 minuti · '+(ready?'Classifica determinata dai risultati dei gironi':'In attesa delle classifiche dei gironi')+'</p>'+
      '<table class="gsb-matches"><thead><tr><th>Turno</th><th>Ora</th><th>Campo</th><th>Incontro</th><th>Risultato</th></tr></thead><tbody>';
    pairs.forEach((pair,i)=>{
      const score=scores[i].split('-');
      const disabled=ready?'':' disabled';
      html+='<tr><td>'+(i+1)+'</td><td>'+timeAt((3+i)*20)+'</td><td>'+stage.court+'</td><td>'+esc(teamName(labels[pair[0]]))+' <b>vs</b> '+esc(teamName(labels[pair[1]]))+'</td><td><div class="gsb-score">'+
        '<input type="number" min="0" step="1" aria-label="Risultato '+stage.key+' partita '+(i+1)+' squadra 1" value="'+(score[0]==='-'?'':esc(score[0]))+'"'+disabled+' oninput="window.updateGoldSilverBronzeScore(\''+stage.key+'\','+i+',0,this.value)">'+
        '<span>–</span><input type="number" min="0" step="1" aria-label="Risultato '+stage.key+' partita '+(i+1)+' squadra 2" value="'+esc(score[1]||'')+'"'+disabled+' oninput="window.updateGoldSilverBronzeScore(\''+stage.key+'\','+i+',1,this.value)">'+
        '</div></td></tr>';
    });
    html+='</tbody></table><div id="gsb-standings-'+stage.key+'">'+finalStandingsHtml(stage,teams)+'</div></div>';
  });
  html+='<p class="gsb-total"><b>Riepilogo:</b> 9 partite nei gironi + 9 partite nelle finali = 18 partite. Con 3 campi e turni da 20 minuti: 6 turni da 20 minuti = 120 minuti teorici, escluse pause e cambi.</p>';
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
  const parts=validScore(s[key][index])?String(s[key][index]).split('-'):['',''];
  parts[side]=String(value??'').trim();
  s[key][index]=parts.every(x=>x==='')?'-':parts.join('-');
  s.goldSilverBronze=s.goldSilverBronze||{version:1,results:{}};
  s.goldSilverBronze.results=s.goldSilverBronze.results||{};
  s.goldSilverBronze.results[stageKey]=normalizedResults(s[key]);
  updateFinalStandings(stageKey);
  if(typeof window.updateAndSync==='function')window.updateAndSync();
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
  if(isSpecial()){
    alert('La formula Gold/Silver/Bronze mantiene la struttura concordata: 9 squadre, 3 gironi da 3 e finali Gold/Silver/Bronze.');
    configureRules();renderCustomFinals();return false;
  }
  return typeof baseApplyModel==='function'?baseApplyModel.apply(this,arguments):undefined;
};
})();