import { withSupabase } from "npm:@supabase/server@^1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanUrl(value: string, base?: string) {
  try {
    const u = base ? new URL(value, base) : new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    if (u.port && !["80", "443"].includes(u.port)) return "";
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")
      || h === "metadata.google.internal" || h === "0.0.0.0" || h === "::1" || h.startsWith("[")
      || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return "";
    return u.href;
  } catch { return ""; }
}

async function fetchWithSafeRedirects(startUrl: string, maxRedirects = 4): Promise<Response | null> {
  let current = startUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 sponsor-logo-fetcher", "Accept": "text/html,image/*;q=0.9,*/*;q=0.1" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || i === maxRedirects) return null;
    const next = cleanUrl(location, current);
    if (!next) return null;
    current = next;
  }
  return null;
}

async function readLimited(response: Response, limit: number): Promise<Uint8Array | null> {
  const sizeHeader = Number(response.headers.get("content-length") || 0);
  if (sizeHeader > limit) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function pickLogo(html: string, baseUrl: string) {
  const candidates: string[] = [];
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*>/gi,
    /<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon|mask-icon)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(?:icon|apple-touch-icon|mask-icon)[^"']*["'][^>]*>/gi,
    /<img[^>]+(?:class|id)=["'][^"']*(?:logo|brand|site-logo|header-logo)[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/gi,
    /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id)=["'][^"']*(?:logo|brand|site-logo|header-logo)[^"']*["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) candidates.push(match[1]);
  }
  candidates.push("/favicon.ico");
  for (const candidate of candidates) {
    const url = cleanUrl(candidate, baseUrl);
    if (url) return url;
  }
  return "";
}

async function fetchImage(url: string) {
  const response = await fetchWithSafeRedirects(url);
  if (!response?.ok) return null;
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
  if (!allowed.has(contentType)) return null;
  const body = await readLimited(response, 5 * 1024 * 1024);
  if (!body?.length) return null;
  return { body, contentType };
}

function extension(contentType: string) {
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/avif") return "avif";
  return "png";
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

    try {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) return json({ error: "Autenticazione richiesta" }, 401);
      const { data: authData, error: authError } = await ctx.supabaseAdmin.auth.getUser(token);
      const user = authData?.user;
      if (authError || !user) return json({ error: "Sessione non valida" }, 401);
      const { data: assurance, error: assuranceError } = await ctx.supabaseAdmin.auth.mfa.getAuthenticatorAssuranceLevel(token);
      if (assuranceError || assurance?.currentLevel !== "aal2") return json({ error: "Verifica MFA richiesta per la gestione sponsor." }, 403);

      const body = await req.json();
      const sponsorId = Number(body?.sponsorId);
      const siteUrl = cleanUrl(String(body?.link || ""));
      if (!Number.isSafeInteger(sponsorId) || sponsorId <= 0) return json({ error: "sponsorId non valido" }, 400);
      if (!siteUrl) return json({ error: "Link sponsor non valido" }, 400);

      const { data: sponsor, error: sponsorError } = await ctx.supabaseAdmin
        .from("sponsor").select("id,azienda_id").eq("id", sponsorId).maybeSingle();
      if (sponsorError) throw sponsorError;
      if (!sponsor) return json({ error: "Sponsor non trovato" }, 404);
      if (!sponsor.azienda_id) return json({ error: "Sponsor senza società associata." }, 409);

      const { data: company, error: companyError } = await ctx.supabaseAdmin
        .from("aziende").select("owner_user_id").eq("id", sponsor.azienda_id).maybeSingle();
      if (companyError) throw companyError;
      if (!company) return json({ error: "Società dello sponsor non trovata." }, 404);

      const isOwner = company.owner_user_id === user.id;
      const { data: membership, error: membershipError } = await ctx.supabaseAdmin
        .from("azienda_utenti").select("ruolo,attivo")
        .eq("azienda_id", sponsor.azienda_id).eq("user_id", user.id).eq("attivo", true).maybeSingle();
      if (membershipError) throw membershipError;
      const isCompanyAdmin = !!membership && ["admin", "amministratore", "owner", "proprietario"].includes(String(membership.ruolo || "").toLowerCase());
      if (!isOwner && !isCompanyAdmin) {
        return json({ error: "Non sei autorizzato a modificare gli sponsor di questa società." }, 403);
      }

      const page = await fetchWithSafeRedirects(siteUrl);
      if (!page?.ok) return json({ error: "Sito non raggiungibile o reindirizzamento non sicuro." }, 422);
      const htmlBytes = await readLimited(page, 2 * 1024 * 1024);
      if (!htmlBytes) return json({ error: "Pagina troppo grande da analizzare." }, 413);
      const html = new TextDecoder().decode(htmlBytes);
      const base = cleanUrl(page.url || siteUrl) || siteUrl;
      const logoUrl = pickLogo(html, base);
      if (!logoUrl) return json({ error: "Logo non trovato sul sito" }, 422);

      const image = await fetchImage(logoUrl);
      if (!image) return json({ error: "Logo non scaricabile: formato non supportato o file troppo grande." }, 422);

      const path = `sponsor-auto/${sponsorId}-${crypto.randomUUID()}.${extension(image.contentType)}`;
      const upload = await ctx.supabaseAdmin.storage.from("azienda-assets").upload(path, image.body, {
        contentType: image.contentType,
        cacheControl: "86400",
        upsert: true,
      });
      if (upload.error) throw upload.error;

      const publicUrl = ctx.supabaseAdmin.storage.from("azienda-assets").getPublicUrl(path).data.publicUrl;
      const update = await ctx.supabaseAdmin.from("sponsor").update({ immagine: publicUrl }).eq("id", sponsorId).eq("azienda_id", sponsor.azienda_id);
      if (update.error) throw update.error;
      return json({ ok: true, logoUrl: publicUrl, source: logoUrl });
    } catch (error) {
      console.error("SPONSOR LOGO AUTO:", error);
      return json({ error: "Errore nel recupero del logo sponsor." }, 500);
    }
  }),
};
