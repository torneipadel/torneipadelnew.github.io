(()=>{'use strict';
function openPosterEditor(){
 const root=document.getElementById('appContent');if(!root)return;
 root.innerHTML='<div class="page-head"><div><h1>🎨 Creazione locandine</h1><p>Editor manuale Eventour</p></div><button type="button" class="btn" id="evPosterBack">← Torna al torneo</button></div><section id="naiManualPosterPanel" style="display:block!important;visibility:visible!important;opacity:1!important;width:100%;box-sizing:border-box;margin:14px 0;padding:16px;border:1px solid rgba(141,232,216,.28);border-radius:16px;background:rgba(2,16,24,.58)"></section>';
 const panel=document.getElementById('naiManualPosterPanel');
 document.getElementById('evPosterBack')?.addEventListener('click',()=>window.openAdminPage?.('torneo'));
 if(typeof window.mountEventourPosterEditor==='function'){window.mountEventourPosterEditor(panel);if(!panel.querySelector('#evPosterCanvas'))panel.innerHTML='<h3>Editor locandine Eventour</h3><p style="color:#fff">Il modulo è stato richiamato ma non ha creato l’anteprima. Ricarica la pagina amministrativa e riprova.</p>'}
 else panel.innerHTML='<h3>Editor locandine Eventour</h3><p style="color:#fff">Il file dell’editor non è stato caricato. Verificare admin-news-poster-editor-v2.js.</p>';
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
window.openEventourPosterEditor=openPosterEditor;
function capture(e){const b=e.target?.closest?.('[data-com-page="locandine"]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();document.getElementById('mobileOverlay')?.classList.remove('open');openPosterEditor()}
document.addEventListener('click',capture,true);
const oldRouter=window.openAdminComPage;window.openAdminComPage=function(page,...args){if(page==='locandine'){openPosterEditor();return}return oldRouter?.(page,...args)};
function bind(){document.querySelectorAll('[data-com-page="locandine"]').forEach(b=>{if(b.dataset.posterEntryBound)return;b.dataset.posterEntryBound='1';b.addEventListener('click',capture,true)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();