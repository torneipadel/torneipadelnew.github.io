(() => {
  "use strict";
  const SUPABASE_URL = "https://dkeqicstprvvfebiaooc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu";
  const status = document.getElementById("app");
  const say = message => { if (status) status.textContent = message; };
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
    say("Accesso tecnico verificato. Apertura del pannello Superadmin…");
    location.replace("admin.html");
  }
  document.getElementById("backBtn")?.addEventListener("click", () => location.replace("admin.html"));
  document.getElementById("refreshBtn")?.addEventListener("click", enterTechnicalArea);
  enterTechnicalArea().catch(() => {
    say("Verifica tecnica non riuscita. Accedi nuovamente.");
    setTimeout(() => location.replace("login.html"), 1200);
  });
})();
