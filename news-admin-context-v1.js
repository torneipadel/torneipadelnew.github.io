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
    let row=Array.isArray(accessResult?.data)?accessResult.data[0]:accessResult?.data;

    // Stesso fallback membership usato dal login admin, se l'RPC non restituisce il contesto.
    if(!row?.azienda_id){
      let membershipQuery=client.from('azienda_utenti')
        .select('azienda_id,ruolo,attivo')
        .eq('user_id',data.session.user.id)
        .eq('attivo',true);
      if(selectedTenantId)membershipQuery=membershipQuery.eq('azienda_id',selectedTenantId);
      const membership=await membershipQuery.maybeSingle();
      if(!membership.error&&membership.data?.azienda_id){
        const company=await client.from('aziende')
          .select('id,nome_app,slug,stato')
          .eq('id',membership.data.azienda_id)
          .maybeSingle();
        if(!company.error&&company.data&&['attiva','configurazione'].includes(String(company.data.stato||'').toLowerCase())){
          row={azienda_id:company.data.id,nome_app:company.data.nome_app,ruolo:membership.data.ruolo};
        }
      }
    }
    if(!row?.azienda_id)return;
    if(selectedTenantId&&String(row.azienda_id)!==selectedTenantId)return;
    if(row.accesso_consentito===false)return;
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