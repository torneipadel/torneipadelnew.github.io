/* Verifica il contesto amministratore su News usando la sessione principale Eventour.
   Nessun link admin viene abilitato sulla sola presenza di una sessione visitatore. */
(()=>{
'use strict';
async function init(){
  const URL='https://dkeqicstprvvfebiaooc.supabase.co';
  const KEY='sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu';
  const client=window.sb||window.supabaseClient||(window.supabase?.createClient?window.supabase.createClient(URL,KEY):null);
  if(!client?.auth?.getSession||typeof client.rpc!=='function')return;
  try{
    const {data,error}=await client.auth.getSession();
    if(error||!data?.session?.user)return;
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance.error||assurance.data?.currentLevel!=='aal2')return;

    let accessResult=null;
    let lastError=null;
    let selectedTenantId='';
    try{selectedTenantId=String(sessionStorage.getItem('nextpoint_login_azienda_id')||'').trim()}catch(_){}
    for(let attempt=0;attempt<3;attempt++){
      accessResult=await client.rpc('get_my_azienda_access',selectedTenantId?{p_azienda_id:selectedTenantId}:{});
      lastError=accessResult.error||null;
      const candidate=Array.isArray(accessResult.data)?accessResult.data[0]:accessResult.data;
      if(candidate?.azienda_id||!lastError)break;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(lastError)return;
    const row=Array.isArray(accessResult?.data)?accessResult.data[0]:accessResult?.data;
    if(!row?.azienda_id)return;
    if(selectedTenantId&&String(row.azienda_id)!==selectedTenantId)return;
    const role=String(row.ruolo||'').toLowerCase();
    if(!['owner','admin'].includes(role))return;

    window.adminRuolo=role;
    window.isAdmin=true;
    window.isSuperadmin=false;
    window.isGlobalSuperadmin=false;
    window.isGlobalPlatformAdmin=false;
    window.isTenantOwner=role==='owner';
    window.aziendaId=row.azienda_id;
    window.nomeAppAzienda=row.nome_app||'';
    document.documentElement.dataset.adminRole=role;
    window.dispatchEvent(new CustomEvent('admin:role-ready',{detail:{
      ruolo:role,isAdmin:true,isSuperadmin:false,isTenantOwner:window.isTenantOwner,aziendaId:row.azienda_id
    }}));
  }catch(error){
    console.warn('News: contesto amministratore non verificato; mantengo il menu pubblico.',error);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();