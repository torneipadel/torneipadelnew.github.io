(function(){
  'use strict';
  const getClient=()=>window.sb||window.supabaseClient||window.supabase;
  const isGlobalSuperadmin=()=>window.isGlobalSuperadmin===true||String(window.adminState?.adminEmail||'').trim().toLowerCase()==='giose.rizzi@gmail.com';
  const tenantId=()=>String(window.aziendaId||'').trim();
  const isGlobal=()=>{
    if(window.isPlatformAdmin===true) return true;
    const email=String(window.adminState?.adminEmail||'').trim().toLowerCase();
    return email==='giose.rizzi@gmail.com'||email==='boverob@libero.it'||email==='cfalba@libero.it';
  };
  function companyLabel(){
    const name=String(window.nomeAppAzienda||'').trim();
    const email=String(window.adminState?.adminEmail||'').trim();
    return name?`Società: ${name}${email?` · ${email}`:''}`:email;
  }
  function renderCompanyBadge(){
    if(!tenantId()) return;
    const top=document.querySelector('.topbar');
    if(!top)return;
    let el=document.getElementById('adminTenantBadge');
    if(!el){
      el=document.createElement('div');
      el.id='adminTenantBadge';
      el.style.cssText='margin-left:12px;padding:7px 12px;border:1px solid rgba(0,0,0,.12);border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;max-width:42vw;overflow:hidden;text-overflow:ellipsis;';
      const spacer=top.querySelector('.topbar-spacer');
      if(spacer) spacer.insertAdjacentElement('afterend',el); else top.appendChild(el);
    }
    el.textContent=companyLabel();
    el.title=companyLabel();
  }
  async function loadTenantTornei(){
    if(isGlobalSuperadmin()&&!tenantId()){
      const state=window.adminState||{};
      state.tornei=[];
      state.torneoSelezionato=null;
      window.adminState=state;
      if(typeof window.salvaAdminState==='function')window.salvaAdminState();
      if(typeof window.renderCleanAdmin==='function')window.renderCleanAdmin();
      else if(typeof window.renderAdmin==='function')window.renderAdmin();
      return [];
    }
    const sb=getClient();
    if(!sb)throw new Error('Supabase client non disponibile');
    const q=sb.from('tornei').select('*').order('id',{ascending:false});
    const id=tenantId();
    // Il contesto aziendale prevale anche per il Superadmin globale: se è
    // stata selezionata una società, non caricare mai i tornei delle altre.
    if(!id)throw new Error('Contesto società mancante: caricamento tornei bloccato.');
    const result=await q.eq('azienda_id',id);
    if(result.error)throw result.error;
    const state=window.adminState||{};
    state.tornei=Array.isArray(result.data)?result.data:[];
    window.adminState=state;
    if(typeof window.salvaAdminState==='function')window.salvaAdminState();
    if(typeof window.renderCleanAdmin==='function')window.renderCleanAdmin();
    else if(typeof window.renderAdmin==='function')window.renderAdmin();
    return result.data;
  }
  function install(){
    if(window.__tenantIsolationInstalled)return;
    window.__tenantIsolationInstalled=true;
    window.caricaTorneiSupabase=loadTenantTornei;
    renderCompanyBadge();
    if(typeof window.caricaTorneiSupabase==='function' && tenantId()) loadTenantTornei().catch(e=>console.error('Errore caricamento dati società:',e));
  }
  window.addEventListener('admin:role-ready',()=>setTimeout(install,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
