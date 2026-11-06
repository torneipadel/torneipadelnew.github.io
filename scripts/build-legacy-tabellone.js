const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
const presetEnv = require("@babel/preset-env");

const htmlPath = path.resolve("tabellone.html");
let html = fs.readFileSync(htmlPath, "utf8");
const localScripts = new Set();

html = html.replace(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi, (whole, attrs, source) => {
  if (/\\bsrc\\s*=/.test(attrs) || !source.trim()) return whole;
  if (/\\btype\\s*=\\s*["'](?:application\\/json|application\\/ld\\+json)["']/i.test(attrs)) return whole;
  const result = babel.transformSync(source, {
    filename: "tabellone-inline.js",
    sourceType: "script",
    comments: true,
    compact: false,
    presets: [[presetEnv, { targets: { safari: "10.3" }, bugfixes: true, modules: false }]]
  });
  return "<script" + attrs + ">\\n" + result.code + "\\n</script>";
});

const srcPattern = /<script\\b[^>]*\\bsrc\\s*=\\s*["']([^"']+)["'][^>]*>/gi;
let match;
while ((match = srcPattern.exec(html))) {
  const raw = match[1].split("?")[0];
  if (/^(?:https?:)?\\/\\//i.test(raw) || raw.startsWith("data:")) continue;
  const relative = raw.replace(/^\\.\\//, "").replace(/^\\//, "");
  if (relative.endsWith(".js")) localScripts.add(relative);
}

for (const relative of localScripts) {
  const file = path.resolve(relative);
  if (!file.startsWith(path.resolve(".") + path.sep) || !fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const result = babel.transformSync(source, {
    filename: relative,
    sourceType: "script",
    comments: true,
    compact: false,
    presets: [[presetEnv, { targets: { safari: "10.3" }, bugfixes: true, modules: false }]]
  });
  fs.writeFileSync(file, result.code + "\\n", "utf8");
}

const polyfillTag = '<script src="tabellone-legacy-polyfills.js?v=1"><\\/script>';
if (!html.includes("tabellone-legacy-polyfills.js")) {
  const firstScript = html.search(/<script\\b/i);
  if (firstScript < 0) throw new Error("Nessun tag script trovato in tabellone.html");
  html = html.slice(0, firstScript) + polyfillTag + "\\n" + html.slice(firstScript);
}
fs.writeFileSync(htmlPath, html, "utf8");
console.log("Tabellone legacy build completata. Script locali trasformati: " + localScripts.size);
