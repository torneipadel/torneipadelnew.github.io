import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  if (!admin) return json({ error: "Servizio non configurato" }, 503);

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Autenticazione richiesta" }, 401);

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Sessione non valida" }, 401);
    const { data: assurance, error: assuranceError } = await admin.auth.mfa.getAuthenticatorAssuranceLevel(token);
    if (assuranceError || assurance?.currentLevel !== "aal2") return json({ error: "Verifica MFA richiesta per le funzioni amministrative." }, 403);

    const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
      admin.from("profili").select("ruolo").eq("user_id", user.id).maybeSingle(),
      admin.from("azienda_utenti").select("ruolo,attivo").eq("user_id", user.id).eq("attivo", true)
    ]);
    if (profileError || membershipError) {
      console.error("NEWS AI role lookup failed");
      return json({ error: "Impossibile verificare i permessi." }, 500);
    }

    const globalRole = String(profile?.ruolo || "").toLowerCase();
    const hasGlobalAdmin = ["admin", "superadmin"].includes(globalRole);
    const hasTenantAdmin = (memberships || []).some((m: any) =>
      ["owner", "admin", "superadmin"].includes(String(m.ruolo || "").toLowerCase())
    );
    if (!hasGlobalAdmin && !hasTenantAdmin) return json({ error: "Operazione riservata agli amministratori." }, 403);

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "Comunicazione").slice(0, 80);
    const title = String(body?.title || "").trim().slice(0, 300);
    const data = body?.data && typeof body.data === "object" ? body.data : {};
    const dataJson = JSON.stringify(data);
    if (dataJson.length > 8000) return json({ error: "I dati inviati sono troppo lunghi." }, 413);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "OPENAI_API_KEY non configurata" }, 503);

    const prompt = `Sei il redattore marketing di un club di padel italiano. Crea una News pronta per pubblicazione. Tipo: ${type}. Idea/titolo: ${title}. Dati: ${dataJson}. Regole: italiano naturale, tono professionale ma coinvolgente, niente dati inventati, non aggiungere prezzi/date/nomi non presenti. Restituisci SOLO JSON valido con le chiavi title, text, cta. Il testo deve essere breve, leggibile anche su una locandina, con emoji solo dove utili.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Sei un copywriter esperto di padel e comunicazione locale." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!response.ok) {
      console.error("NEWS AI provider error:", response.status);
      return json({ error: "Generazione AI temporaneamente non disponibile." }, 502);
    }

    const result = await response.json();
    let output: any;
    try { output = JSON.parse(result.choices?.[0]?.message?.content || "{}"); }
    catch { return json({ error: "Risposta AI non valida." }, 502); }
    if (!output?.title || !output?.text) return json({ error: "Risposta AI incompleta." }, 502);
    return json({
      title: String(output.title).slice(0, 300),
      text: String(output.text).slice(0, 5000),
      cta: String(output.cta || "").slice(0, 300)
    });
  } catch (error) {
    console.error("NEWS AI error:", error);
    return json({ error: "Errore interno nella generazione della news." }, 500);
  }
});
