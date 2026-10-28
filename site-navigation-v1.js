(()=> {
  'use strict';
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isTabellone = page === 'tabellone.html';
  const credentialPages = new Set([
    'index.html','login.html','login-utente.html','login-societa-admin.html',
    'superadmin-login.html','registrazione-utente.html','registrazione-societa.html',
    'registrazione-demo.html','registrazione-piva.html','reset-password.html','iscrizione.html'
  ]);
  if (credentialPages.has(page)) return;

  const isAdminPage = ['admin.html','eventour-control-center.html','configura-app.html','configurazione-app.html','utenti-societa.html','admin-mercatino.html','sponsor.html'].includes(page);
  const css = document.createElement('style');
  css.textContent = `
    .site-global-menu{position:fixed!important;inset:16px 16px auto auto!important;top:16px!important;bottom:auto!important;left:auto!important;right:16px!important;margin:0!important;transform:none!important;z-index:2147483001!important;width:44px!important;height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:12px!important;background:rgba(7,25,45,.88)!important;color:#fff!important;box-shadow:0 5px 18px rgba(0,0,0,.25)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;font:700 23px/1 Arial,sans-serif!important;cursor:pointer!important;padding:0!important}
    .site-global-menu:hover{background:rgba(7,25,45,.98)!important}
    .site-global-menu-panel{position:fixed!important;top:68px!important;right:16px!important;z-index:2147483002!important;display:none!important;width:min(270px,calc(100vw - 32px))!important;max-height:calc(100vh - 90px)!important;overflow:auto!important;padding:8px!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:14px!important;background:rgba(7,25,45,.97)!important;box-shadow:0 12px 32px rgba(0,0,0,.35)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}
    .site-global-menu-panel.open{display:grid!important;gap:4px!important}\n    .site-global-menu-panel [hidden]{display:none!important}
    .site-global-menu-panel a,.site-global-menu-panel button{display:block!important;width:100%!important;box-sizing:border-box!important;padding:11px 12px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#fff!important;text-align:left!important;text-decoration:none!important;font:600 13px/1.35 Arial,sans-serif!important;cursor:pointer!important}
    .site-global-menu-panel a:hover,.site-global-menu-panel button:hover{background:rgba(255,255,255,.12)!important}
    .site-global-menu-separator{height:1px!important;margin:5px 4px!important;background:rgba(255,255,255,.2)!important}
    @media(max-width:600px){.site-global-menu{inset:12px 12px auto auto!important;top:12px!important;bottom:auto!important;left:auto!important;right:12px!important;width:42px!important;height:42px!important;margin:0!important;transform:none!important;.site-global-menu-panel{top:62px!important;right:12px!important}}
  `;
  document.head.appendChild(css);

  function isInsideModal(el){
    return !!el.closest('[role="dialog"],dialog,.modal,[id*="Modal"],[id*="modal"],#teamModal,#rulesModal');
  }
  function removeNavigationArrows(){
    document.querySelectorAll('.brand-back,.btn-back,[aria-label*="torna indietro" i],[aria-label*="torna alla" i]').forEach(el=>{
      if(!isInsideModal(el)) el.remove();
    });
    if(!isTabellone){
      document.querySelectorAll('a,button').forEach(el=>{
        if(isInsideModal(el)) return;
        const t=(el.innerText||el.textContent||'').trim();
        if(!t || t.length>100) return;
        if(/^(←|⬅|❮|‹)\s*(società|indietro|torna|back)/i.test(t) ||
           /^(torna indietro|indietro|←\s*torna alla società|←\s*società)$/i.test(t)){
          el.remove();
        }
      });
    }
  }

  function createMenu(activeSession){
    if(document.querySelector('.site-global-menu')) return;
    const button=document.createElement('button');
    button.type='button'; button.className='site-global-menu'; button.textContent='☰';
    button.setAttribute('aria-label','Apri menu di navigazione'); button.setAttribute('aria-expanded','false');
    const panel=document.createElement('nav'); panel.className='site-global-menu-panel'; panel.setAttribute('aria-label','Navigazione Eventour');
    const addLink=(label,href,adminOnly=false)=>{
      const a=document.createElement('a'); a.textContent=label; a.href=href;
      if(adminOnly){a.dataset.adminOnly='true';a.hidden=true;}
      const q=new URLSearchParams(location.search);
      const companySlug=q.get('azienda') || sessionStorage.getItem('nextpoint_login_azienda_slug') || localStorage.getItem('nextpoint_public_azienda_slug') || '';
      if(companySlug && !href.includes('?')) a.href=href+'?azienda='+encodeURIComponent(companySlug);
      panel.appendChild(a);
    };
    addLink('Home','index.html');
    addLink('Tornei e visitatori','visitatore.html');
    addLink('News','news.html');
    addLink('Mercatino','mercatino.html');
    addLink('Sponsor','sponsor-pubblico.html');
    addLink('Contatti','contatti.html');
    addLink('Profilo','profilo.html');
    const sep=document.createElement('div'); sep.className='site-global-menu-separator'; sep.setAttribute('aria-hidden','true'); sep.hidden=true; panel.appendChild(sep);
    addLink('Area amministrativa','dashboard.html',true);
    addLink('Gestione torneo','admin.html',true);
    addLink('Centro di controllo','eventour-control-center.html',true);
    const exit=document.createElement('button'); exit.type='button'; exit.textContent='Esci dall’account'; exit.dataset.logout='true'; exit.hidden=!activeSession?.user;
    exit.addEventListener('click',async()=>{
      exit.disabled=true; exit.textContent='Uscita…';
      try{
        if(typeof window.logout==='function') await window.logout();
        else if((window.__NP_SUPABASE_CLIENT__||window.sb)?.auth?.signOut){const authClient=window.__NP_SUPABASE_CLIENT__||window.sb;const result=await authClient.auth.signOut();if(result?.error)throw result.error;try{sessionStorage.removeItem('nextpoint_login_azienda_id');sessionStorage.removeItem('nextpoint_login_azienda_slug');sessionStorage.removeItem('nextpoint_login_role');}catch(_){}location.href='index.html';}
        else {location.href='index.html';}
      }catch(e){console.error('Errore durante la disconnessione:',e);exit.disabled=false;exit.textContent='Esci';}
    });
    panel.appendChild(exit);
    function refreshRole(){
      const role=String(document.documentElement.dataset.adminRole||window.adminRuolo||'').toLowerCase();
      const tenantAdmin=!!(window.aziendaId && ['admin','owner','superadmin'].includes(role) && window.isAdmin===true);
      const globalSuperadmin=!!(window.isGlobalSuperadmin===true || (window.isSuperadmin===true && !window.aziendaId));
      const globalAdmin=!!(window.isGlobalPlatformAdmin===true || (window.isAdmin===true && role==='admin' && !window.aziendaId && !window.isSuperadmin));
      const canManageTenant=tenantAdmin;
      const canOpenControlCenter=globalSuperadmin || globalAdmin;
      panel.querySelectorAll('[data-admin-only="true"]').forEach(el=>{
        const href=el.getAttribute('href')||'';
        const isControlCenter=href==='eventour-control-center.html';
        const isExit=el.tagName==='BUTTON';
        if(isControlCenter) el.hidden=!canOpenControlCenter;
        else if(href==='dashboard.html'||href==='admin.html') el.hidden=!canManageTenant;
        else if(isExit) el.hidden=!(tenantAdmin||globalSuperadmin||globalAdmin);
        else el.hidden=true;
      });
      exit.hidden=!(!!activeSession?.user||tenantAdmin||globalSuperadmin||globalAdmin);
      sep.hidden=!(canManageTenant||canOpenControlCenter||tenantAdmin||globalSuperadmin||globalAdmin||!!activeSession?.user);
    }
    refreshRole();
    window.addEventListener('admin:role-ready',refreshRole);
    button.addEventListener('click',()=>{
      const open=panel.classList.toggle('open'); button.setAttribute('aria-expanded',String(open));
    });
    document.addEventListener('click',e=>{
      if(!button.contains(e.target)&&!panel.contains(e.target)){panel.classList.remove('open');button.setAttribute('aria-expanded','false');}
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){panel.classList.remove('open');button.setAttribute('aria-expanded','false');button.focus();}
    });
    document.body.append(button,panel);
  }

  async function init(){
    removeNavigationArrows();
    try {
      const client = window.__NP_SUPABASE_CLIENT__ || window.sb;
      // Il menu pubblico non deve dipendere dalla presenza di Supabase nella pagina.
      if (!client?.auth?.getSession) {
        createMenu(null);
        return;
      }
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn('Sessione non verificata: attivo comunque il menu pubblico.', error);
        createMenu(null);
        return;
      }
      // Il menu pubblico deve essere disponibile anche ai visitatori anonimi.
      // Le voci amministrative restano nascoste finché il ruolo non è verificato.
      createMenu(data?.session || null);
    } catch (e) {
      console.warn('Sessione non verificata: attivo il menu pubblico Eventour.', e);
      createMenu(null);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();