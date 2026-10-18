(()=>{'use strict';
function forceVisible(panel){
 if(!panel||!panel.isConnected)return;
 panel.style.setProperty('display','block','important');
 panel.style.setProperty('visibility','visible','important');
 panel.style.setProperty('opacity','1','important');
 panel.style.setProperty('position','relative','important');
 panel.style.setProperty('z-index','9999','important');
 panel.style.setProperty('width','100%','important');
 panel.style.setProperty('box-sizing','border-box','important');
}
function openPosterEditor(){
 const root=document.getElementById('appContent');if(!root)return;
 root.innerHTML='<div class="page-head"><div><h1>🎨 Creazione locandine</h1><p>Editor manuale Eventour</p></div><button type="button" class="btn" id="evPosterBack">← Torna al torneo</button></div><section id="naiManualPosterPanel" style="display:block!important;visibility:visible!important;opacity:1!important;width:100%;box-sizing:border-box;margin:14px 0;padding:16px;border:1px solid rgba(141,232,216,.28);border-radius:16px;background:rgba(2,16,24,.58)"></section>';
 const panel=document.getElementById('naiManualPosterPanel');
 document.getElementById('evPosterBack')?.addEventListener('click',()=>window.openAdminPage?.('torneo'));
 forceVisible(panel);
 if(typeof window.mountEventourPosterEditor==='function'){
  window.mountEventourPosterEditor(panel);
  forceVisible(panel);
  if(!panel.querySelector('#evPosterCanvas'))panel.innerHTML='<h3>Editor locandine Eventour</h3><p style="color:#fff">Il modulo è stato richiamato ma non ha creato l’anteprima. Ricarica la pagina amministrativa e riprova.</p>';
 } else panel.innerHTML='<h3>Editor locandine Eventour</h3><p style="color:#fff">Il file dell’editor non è stato caricato. Verificare admin-news-poster-editor-v2.js.</p>';
 forceVisible(panel);
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
window.openEventourPosterEditor=openPosterEditor;
function capture(e){const b=e.target?.closest?.('[data-com-page="locandine"]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();document.getElementById('mobileOverlay')?.classList.remove('open');openPosterEditor()}
document.addEventListener('click',capture,true);
const oldRouter=window.openAdminComPage;window.openAdminComPage=function(page,...args){if(page==='locandine'){openPosterEditor();return}return oldRouter?.(page,...args)};
function bind(){document.querySelectorAll('[data-com-page="locandine"]').forEach(b=>{if(b.dataset.posterEntryBound)return;b.dataset.posterEntryBound='1';b.addEventListener('click',capture,true)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
/* Alcuni script legacy impostano manual.style.display='none' dopo aver montato l'editor.
   In questa pagina dedicata la modalità manuale deve restare sempre visibile. */
const visibilityGuard=new MutationObserver(()=>{
 const p=document.getElementById('naiManualPosterPanel');
 if(p&&document.querySelector('#appContent .page-head h1')?.textContent.includes('Creazione locandine'))forceVisible(p);
});
visibilityGuard.observe(document.getElementById('appContent')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
window.addEventListener('admin:render',()=>{
 const p=document.getElementById('naiManualPosterPanel');
 if(p&&document.querySelector('#appContent .page-head h1')?.textContent.includes('Creazione locandine'))forceVisible(p);
});
})();