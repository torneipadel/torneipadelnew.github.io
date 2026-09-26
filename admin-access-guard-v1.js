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
        const email=String(session.user?.email||"").trim().toLowerCase();
        const superadminEmail=email==="giose.rizzi@gmail.com";
        const adminEmail=email==="boverob@libero.it"||email==="cfalba@libero.it";

        if(superadminEmail||adminEmail){
          const ruolo=superadminEmail?"superadmin":"admin";
          window.adminRuolo=ruolo;
          window.isSuperadmin=superadminEmail;
          window.isAdmin=true;
          document.documentElement.dataset.adminRole=ruolo;
          window.dispatchEvent(new CustomEvent("admin:role-ready",{detail:{ruolo,isSuperadmin:superadminEmail,isAdmin:true}}));
          return true;
        }

        // Gli account societari vengono autorizzati dal controllo completo di
        // admin-functions.js. Il guard NON deve più rimandare alla dashboard
        // per un errore transitorio RPC/RLS: altrimenti crea il loop dashboard -> admin -> dashboard.
        let access=null;
        let rpcError=null;
        for(let attempt=0;attempt<3;attempt++){
          const result=await client.rpc("get_my_azienda_access");
          access=result.data;
          rpcError=result.error||null;
          const candidate=Array.isArray(access)?access[0]:access;
          if(!rpcError || candidate?.azienda_id)break;
          await new Promise(resolve=>setTimeout(resolve,500));
        }

        const row=Array.isArray(access)?access[0]:access;
        if(row?.azienda_id){
          const ruolo=String(row.ruolo||"owner").toLowerCase();
          window.adminRuolo=ruolo;
          window.isSuperadmin=false;
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
          console.warn("Admin guard: accesso tenant non determinato; il controllo definitivo resta in admin-functions.js",rpcError||"nessun accesso");
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