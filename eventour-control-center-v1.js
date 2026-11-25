(() => {
  "use strict";
  const SUPABASE_URL = "https://dkeqicstprvvfebiaooc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu";
  const status = document.getElementById("app");
  const say = message => { if (status) status.textContent = message; };
  function clearTenantContext() {
    try {
      sessionStorage.removeItem("nextpoint_login_tenant_explicit");
      sessionStorage.removeItem("nextpoint_login_azienda_id");
      sessionStorage.removeItem("nextpoint_login_azienda_nome");
    } catch (_) {}
  }
  async function enterTechnicalArea() {
    if (!window.supabase?.createClient) {
      say("Servizio di autenticazione non disponibile.");
      return;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session) {
      location.replace("login.html");
      return;
    }
    const { data: globalRole, error: roleError } = await client.rpc("is_superadmin");
    if (roleError || globalRole !== true) {
      location.replace("dashboard.html");
      return;
    }
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") {
      location.replace("sicurezza-mfa.html?return=eventour-control-center.html");
      return;
    }
    const { error: tenantContextError } = await client.rpc("clear_my_tenant_context");
    if (tenantContextError) {
      say("Impossibile chiudere il contesto aziendale. Riprova prima di entrare nell’area tecnica.");
      return;
    }
    clearTenantContext();
    say("Accesso tecnico verificato. Apertura del pannello Superadmin…");
    location.replace("admin.html");
  }
  document.getElementById("backBtn")?.addEventListener("click", enterTechnicalArea);
  document.getElementById("refreshBtn")?.addEventListener("click", enterTechnicalArea);
  enterTechnicalArea().catch(() => {
    say("Verifica tecnica non riuscita. Accedi nuovamente.");
    setTimeout(() => location.replace("login.html"), 1200);
  });
})();
