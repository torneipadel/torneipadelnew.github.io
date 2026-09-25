(function(){
  'use strict';

  function init(){
    const client=window.sb||window.supabaseClient;
    if(!client){
      setTimeout(init,25);
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
        const adminEmail=email==="boverob@libero.it"||email==="cfalba@libero.it"||email==="admin@test.it";

        if(superadminEmail||adminEmail){
          const ruolo=superadminEmail?"superadmin":"admin";
          window.adminRuolo=ruolo;
          window.isSuperadmin=superadminEmail;
          window.isAdmin=true;
          document.documentElement.dataset.adminRole=ruolo;

          const mini=document.getElementById("adminEmailMini");
          if(mini && session.user?.email) mini.textContent=session.user.email;

          const badge=document.getElementById("adminRoleBadge");
          if(badge){
            badge.textContent=superadminEmail?"👑 SUPERADMIN":"👤 ADMIN";
            badge.dataset.role=ruolo;
          }

          window.dispatchEvent(new CustomEvent("admin:role-ready",{
            detail:{ruolo,isSuperadmin:superadminEmail,isAdmin:true}
          }));
          return true;
        }

        const {data:access,error}=await client.rpc("get_my_azienda_access");
        if(error){
          console.error("Errore verifica accesso azienda:",error);
          window.location.href="dashboard.html";
          return false;
        }

        const row=Array.isArray(access)?access[0]:access;
        if(!row?.azienda_id){
          window.location.href="dashboard.html";
          return false;
        }

        if(row.accesso_consentito!==true){
          window.location.href="dashboard.html?demo=scaduta";
          return false;
        }

        const tenantRole=String(row.ruolo||"owner").toLowerCase();
        const tenantIsSuperadmin=tenantRole==="superadmin";
        const tenantIsAdmin=tenantRole==="admin"||tenantIsSuperadmin||tenantRole==="owner";
        if(!tenantIsAdmin){
          window.location.href="dashboard.html";
          return false;
        }
        window.adminRuolo=tenantRole;
        window.isSuperadmin=tenantIsSuperadmin;
        window.isAdmin=true;
        window.isTenantOwner=tenantRole==="owner";
        window.isTenantSuperadmin=tenantIsSuperadmin;
        window.aziendaId=row.azienda_id;
        window.nomeAppAzienda=row.nome_app||"";
        document.documentElement.dataset.adminRole=tenantRole;

        const mini=document.getElementById("adminEmailMini");
        if(mini && session.user?.email) mini.textContent=session.user.email;

        const badge=document.getElementById("adminRoleBadge");
        if(badge){
          badge.textContent=tenantRole==="owner"?"🏢 OWNER":(tenantRole==="superadmin"?"👑 SUPERADMIN SOCIETÀ":"👤 ADMIN SOCIETÀ");
          badge.dataset.role=tenantRole;
        }

        window.dispatchEvent(new CustomEvent("admin:role-ready",{
          detail:{ruolo:"owner",isSuperadmin:false,isAdmin:true,isTenantOwner:true,aziendaId:row.azienda_id}
        }));
        return true;
      }catch(e){
        console.error("Errore verifica accesso amministratore:",e);
        window.location.href="dashboard.html";
        return false;
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