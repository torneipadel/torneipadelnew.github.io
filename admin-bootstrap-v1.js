/* ADMIN BOOTSTRAP — wiring e cleanup finale, estratto da admin.html */
window.logoutAdmin=async function(){try{if(window.sb?.auth?.signOut){await Promise.race([window.sb.auth.signOut(),new Promise(resolve=>setTimeout(resolve,1500))])}}catch(e){}try{localStorage.removeItem('padel_admin_state');if(window.__adminStorageKey)localStorage.removeItem(window.__adminStorageKey)}catch(e){}window.adminState=window.adminState||{};window.adminState.adminLoggato=false;window.adminState.adminEmail='';window.adminRuolo='';window.isAdmin=false;window.isSuperadmin=false;document.documentElement.dataset.adminRole='';try{history.replaceState(null,'','admin.html')}catch(e){}window.location.replace('index.html')};(function(){
'use strict';
const go=p=>{if(typeof window.openAdminPage==='function')return window.openAdminPage(p);console.error('Navigazione Admin non disponibile:',p);return false};
const bindStatic=(id,fn)=>document.getElementById(id)?.addEventListener('click',e=>{e.preventDefault();fn()});
bindStatic('topNew',()=>window.apriWizardTorneo?.());
bindStatic('sideRefresh',()=>window.refreshCleanAdmin?.());
bindStatic('topRefresh',()=>window.refreshCleanAdmin?.());
const openSelectedBove=()=>{const t=window.adminState?.tornei?.find(x=>String(x.id)===String(window.adminState?.torneoSelezionato));if(t)window.apriBoveConTorneo?.(t.id);else alert('Seleziona prima un torneo')};
bindStatic('sideTabellone',openSelectedBove);
bindStatic('sideCalendario',()=>window.openAdminCalendar?.());
bindStatic('sideKing',()=>window.apriKingSeparato?.());
bindStatic('sidePrivacy',()=>window.openAdminPrivacy?.());
bindStatic('mobileTabellone',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');openSelectedBove()});
bindStatic('mobileCalendario',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.openAdminCalendar?.()});
bindStatic('mobileKing',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.apriKingSeparato?.()});
bindStatic('mobilePrivacy',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.openAdminPrivacy?.()});
bindStatic('mobileMenu',()=>document.getElementById('mobileOverlay')?.classList.add('open'));
bindStatic('mobileClose',()=>document.getElementById('mobileOverlay')?.classList.remove('open'));
/* Delegazione: la sidebar può essere ricreata dai moduli UI dopo il login.
   Gestire il click a livello document evita che i nuovi pulsanti restino senza handler. */
document.addEventListener('click',e=>{
 const contentButton=e.target?.closest?.('#sideLocandineArticles, #mobileLocandineArticles');
 if(contentButton){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  document.getElementById('mobileOverlay')?.classList.remove('open');
  if(typeof window.openEventourContentStudio==='function')window.openEventourContentStudio();
  else {console.error('Editor Locandine & Articoli non caricato: verificare admin-creazione-locandine-articoli-v1.js');alert('Editor Locandine & Articoli non caricato. Ricarica la pagina; se il problema persiste, controllare il caricamento dello script.');}
  return;
 }
 const b=e.target?.closest?.('#areaAdmin .sidebar .nav button[data-page], .mobile-nav [data-page]');
 if(!b)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 if(b.closest('.mobile-nav'))document.getElementById('mobileOverlay')?.classList.remove('open');
 document.querySelectorAll('#areaAdmin .sidebar .nav button[data-page]').forEach(x=>x.classList.toggle('active',x===b));
 go(b.dataset.page);
},true);
})();

/* --- blocco successivo --- */


/* FIX FINALE SIDEBAR MOBILE — una sola voce Tabellone e una sola voce Calendario. */
(function(){
  'use strict';
  const keepOnlyOne = (selector) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    nodes.slice(1).forEach(node => node.remove());
  };
  const cleanMobileSidebar = () => {
    keepOnlyOne('#mobileOverlay');
    const nav = document.querySelector('#mobileOverlay .mobile-nav');
    if (!nav) return;
    keepOnlyOne('#mobileOverlay #mobileTabellone');
    keepOnlyOne('#mobileOverlay #mobileCalendario');
  };
  cleanMobileSidebar();
  const observer = new MutationObserver(() => cleanMobileSidebar());
  observer.observe(document.body, { childList:true, subtree:true });
})();



/* Consolidated small Admin fixes: duplicate controls + central calendar routing. */
(function(){
  'use strict';
  const removeDuplicates=()=>{
    document.getElementById('newTournament')?.remove();
    document.getElementById('refreshTournaments')?.remove();
  };
  const bindParticipantsRefresh=()=>{
    const original=window.openAdminPage;
    if(typeof original!=='function'||original.__participantsFixBound)return;
    const wrapped=async function(page){
      if(page==='partecipanti'&&typeof window.caricaRichiesteIscrizione==='function') await window.caricaRichiesteIscrizione();
      return original.apply(this,arguments);
    };
    wrapped.__participantsFixBound=true;
    window.openAdminPage=wrapped;
  };
  const initDuplicateFix=()=>{
    const root=document.getElementById('appContent');
    if(!root)return;
    removeDuplicates();
    bindParticipantsRefresh();
    new MutationObserver(removeDuplicates).observe(root,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDuplicateFix,{once:true});else initDuplicateFix();

  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('#calendar');
    if(!button)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(typeof window.openAdminCalendar==='function')window.openAdminCalendar();
  },true);
})();
