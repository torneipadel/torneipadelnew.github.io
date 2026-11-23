(function(){
  'use strict';

  function init(){
    const client=window.sb||window.supabaseClient;
    if(!client){
      setTimeout(init,50);
      return;
    }

    async function verificaAccessoAdmin(session){
      if(!session){
        window.location.href="index.html";
        return false;
      }

      try{
        const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if(assurance.error || assurance.data?.currentLevel!=="aal2"){
          window.location.replace("sicurezza-mfa.html?return=admin.html");
          return false;
        }
        const email=String(session.user?.email||"").trim().toLowerCase();
        // Il ruolo globale è deciso esclusivamente da Supabase, mai dall'indirizzo email.
        const globalCheck=await client.rpc("is_superadmin");
        if(!globalCheck.error && globalCheck.data===true){
          const ruolo="superadmin";
          window.adminRuolo=ruolo;
          window.isSuperadmin=true;
          window.isGlobalSuperadmin=true;
          window.isGlobalPlatformAdmin=true;
          window.isAdmin=true;
          window.aziendaId=null;
          document.documentElement.dataset.adminRole=ruolo;
          window.dispatchEvent(new CustomEvent("admin:role-ready",{detail:{ruolo,isSuperadmin:true,isAdmin:true,isGlobalSuperadmin:true}}));
          return true;
        }

        // Gli account societari vengono autorizzati dal controllo completo di
        // admin-functions.js. Il guard NON deve più rimandare alla dashboard
        // per un errore transitorio RPC/RLS: altrimenti crea il loop dashboard -> admin -> dashboard.
        let access=null;
        let rpcError=null;
        const selectedTenantId=String(sessionStorage.getItem("nextpoint_login_azienda_id")||"").trim();
        for(let attempt=0;attempt<3;attempt++){
          const result=await client.rpc("get_my_azienda_access",selectedTenantId?{p_azienda_id:selectedTenantId}:{});
          access=result.data;
          rpcError=result.error||null;
          const candidate=Array.isArray(access)?access[0]:access;
          if(!rpcError || candidate?.azienda_id)break;
          await new Promise(resolve=>setTimeout(resolve,500));
        }

        const row=Array.isArray(access)?access[0]:access;
        if(row?.azienda_id&&(!selectedTenantId||String(row.azienda_id)===selectedTenantId)){
          const ruolo=String(row.ruolo||"owner").toLowerCase();
          if(!["owner","admin"].includes(ruolo)){
            window.location.href="dashboard.html?v=member";
            return false;
          }
          window.adminRuolo=ruolo;
          window.isSuperadmin=false;
          window.isGlobalSuperadmin=false;
          window.isGlobalPlatformAdmin=false;
          window.isAdmin=["owner","admin","superadmin"].includes(ruolo);
          window.isTenantOwner=ruolo==="owner";
          window.isTenantSuperadmin=ruolo==="superadmin";
          window.aziendaId=row.azienda_id;
          window.nomeAppAzienda=row.nome_app||"";
          document.documentElement.dataset.adminRole=ruolo;
          window.dispatchEvent(new CustomEvent("admin:role-ready",{detail:{
            ruolo,isSuperadmin:false,isAdmin:window.isAdmin,
            isTenantOwner:window.isTenantOwner,aziendaId:row.azienda_id
          }}));
        }else{
          console.warn("Admin guard: accesso tenant non autorizzato o non determinato",rpcError||"nessun accesso");
          window.location.replace("dashboard.html?access=denied");
          return false;
        }
        return true;
      }catch(e){
        console.error("Errore guard Admin:",e);
        // Mai creare un loop verso dashboard per un errore del guard.
        return true;
      }
    }

    client.auth.getSession().then(({data:{session}})=>verificaAccessoAdmin(session));
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN" && session) verificaAccessoAdmin(session);
      if(event==="SIGNED_OUT") window.location.href="index.html";
    });
  }

  init();
})();