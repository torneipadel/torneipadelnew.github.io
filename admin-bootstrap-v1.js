/* ADMIN BOOTSTRAP — wiring e cleanup finale, estratto da admin.html */
window.logoutAdmin=async function(){try{if(window.sb?.auth?.signOut){await Promise.race([window.sb.auth.signOut(),new Promise(resolve=>setTimeout(resolve,1500))])}}catch(e){}try{localStorage.removeItem('padel_admin_state')}catch(e){}window.adminState=window.adminState||{};window.adminState.adminLoggato=false;window.adminState.adminEmail='';window.adminRuolo='';window.isAdmin=false;window.isSuperadmin=false;document.documentElement.dataset.adminRole='';try{history.replaceState(null,'','admin.html')}catch(e){}window.location.replace('index.html')};(function(){const go=p=>window.openAdminPage?.(p);document.getElementById('topNew')?.addEventListener('click',()=>window.apriWizardTorneo?.());document.getElementById('sideRefresh')?.addEventListener('click',()=>window.refreshCleanAdmin?.());document.getElementById('topRefresh')?.addEventListener('click',()=>window.refreshCleanAdmin?.());document.querySelectorAll('#areaAdmin .sidebar .nav button[data-page]').forEach(b=>{b.dataset.sidebarBound='1';b.addEventListener('click',()=>{document.querySelectorAll('#areaAdmin .sidebar .nav button[data-page]').forEach(x=>x.classList.remove('active'));b.classList.add('active');go(b.dataset.page)})});const openSelectedBove=()=>{const t=window.adminState?.tornei?.find(x=>String(x.id)===String(window.adminState?.torneoSelezionato));if(t)window.apriBoveConTorneo?.(t.id);else alert('Seleziona prima un torneo')};document.getElementById('sideTabellone')?.addEventListener('click',openSelectedBove);document.getElementById('sideCalendario')?.addEventListener('click',()=>window.openAdminCalendar?.());document.getElementById('sideKing')?.addEventListener('click',()=>window.apriKingSeparato?.());document.getElementById('sidePrivacy')?.addEventListener('click',()=>window.openAdminPrivacy?.());document.getElementById('mobileTabellone')?.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');openSelectedBove()});document.getElementById('mobileCalendario')?.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.openAdminCalendar?.()});document.getElementById('mobileKing')?.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.apriKingSeparato?.()});document.getElementById('mobilePrivacy')?.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');window.openAdminPrivacy?.()});document.getElementById('mobileMenu')?.addEventListener('click',()=>document.getElementById('mobileOverlay')?.classList.add('open'));document.getElementById('mobileClose')?.addEventListener('click',()=>document.getElementById('mobileOverlay')?.classList.remove('open'));document.querySelectorAll('.mobile-nav [data-page]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('mobileOverlay')?.classList.remove('open');go(b.dataset.page)}));})();

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
