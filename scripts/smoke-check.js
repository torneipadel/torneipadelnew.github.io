const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = process.cwd();
const pages = [
  "index.html",
  "admin.html",
  "tabellone.html",
  "visitatore.html",
  "login-societa-admin.html",
  "sponsor-pubblico.html",
  "attiva-account.html",
  "registrazione-utente.html"
];
const checked = new Set();
const failures = [];

for (const page of pages) {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    failures.push(`Pagina principale mancante: ${page}`);
    continue;
  }
  const html = fs.readFileSync(pagePath, "utf8");
  const tags = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  let inlineIndex = 0;
  for (const match of tags) {
    const attrs = match[1];
    const body = match[2] || "";
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
    if (srcMatch) {
      if (isModule) continue;
      const raw = srcMatch[1].split("?")[0];
      if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith("data:")) continue;
      const relative = decodeURIComponent(raw).replace(/^\.\//, "").replace(/^\//, "");
      const target = path.resolve(root, relative);
      if (!target.startsWith(root + path.sep)) {
        failures.push(`Percorso script fuori repository in ${page}: ${raw}`);
        continue;
      }
      if (!fs.existsSync(target)) {
        failures.push(`Script locale mancante in ${page}: ${raw}`);
        continue;
      }
      if (checked.has(target)) continue;
      checked.add(target);
      try {
        new vm.Script(fs.readFileSync(target, "utf8"), { filename: relative });
      } catch (error) {
        failures.push(`Errore sintassi in ${relative}: ${error.message}`);
      }
    } else if (!isModule && body.trim()) {
      try {
        new vm.Script(body, { filename: `${page}#inline-${inlineIndex}` });
      } catch (error) {
        failures.push(`Errore sintassi in script inline ${page}#${inlineIndex}: ${error.message}`);
      }
      inlineIndex++;
    }
  }
}

const activationPage = path.join(root, "attiva-account.html");
if (fs.existsSync(activationPage)) {
  const activation = fs.readFileSync(activationPage, "utf8");
  for (const required of [
    'callbackParams.get("type")==="invite"',
    "session.user.email_confirmed_at",
    "sb.auth.updateUser({password:p})",
    'sb.auth.signOut({scope:"local"})'
  ]) {
    if (!activation.includes(required)) {
      failures.push(`Controllo invito/attivazione mancante in attiva-account.html: ${required}`);
    }
  }
} else {
  failures.push("Pagina di attivazione account mancante: attiva-account.html");
}

const visitorRegistrationPage = path.join(root, "registrazione-utente.html");
if (fs.existsSync(visitorRegistrationPage)) {
  const registration = fs.readFileSync(visitorRegistrationPage, "utf8");
  for (const required of [
    'callbackParams.get("type")==="signup"',
    "session.user.email_confirmed_at",
    'sb.rpc("complete_visitor_membership"',
    'sb.rpc("update_visitor_profile"'
  ]) {
    if (!registration.includes(required)) {
      failures.push(`Conferma email/attivazione visitatore mancante in registrazione-utente.html: ${required}`);
    }
  }
} else {
  failures.push("Pagina di registrazione visitatore mancante: registrazione-utente.html");
}

const inviteFunction = path.join(root, "supabase", "functions", "tenant-user-management", "index.ts");
if (fs.existsSync(inviteFunction)) {
  const source = fs.readFileSync(inviteFunction, "utf8");
  if (!source.includes('redirectTo:"https://torneipadel.github.io/torneipadelnew.github.io/attiva-account.html"')) {
    failures.push("Redirect della funzione tenant-user-management non punta alla pagina di attivazione Eventour.");
  }
}

const communications = path.join(root, "admin-comunicazioni-v1.js");
if (fs.existsSync(communications) && /Bove\.html/i.test(fs.readFileSync(communications, "utf8"))) {
  failures.push("Riferimento obsoleto a Bove.html in admin-comunicazioni-v1.js");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Smoke check superato: ${pages.length} pagine principali, ${checked.size} script locali e script inline verificati.`);
