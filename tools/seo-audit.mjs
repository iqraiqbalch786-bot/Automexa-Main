// Static SEO audit of dist/. Usage: node tools/seo-audit.mjs [live|preview]
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
const mode = process.argv[2] || "live"; const DIST = process.argv[3] || "dist";
const SITE = mode === "live" ? "https://automexa.co.uk" : "https://automexa-preview.netlify.app";
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["_astro", "pagefind"].includes(e.name) ? [] : walk(join(d, e.name))) : e.name.endsWith(".html") ? [join(d, e.name)] : []);
const issues = []; const bad = (p, m) => issues.push(`${p}: ${m}`);
const pages = {}; const titles = {}; const descs = {}; const types = new Set(); let imgs = 0, links = 0;
const files = walk(DIST);
for (const f of files) {
  const rel = "/" + relative(DIST, f).split(sep).join("/").replace(/index\.html$/, "");
  const h = readFileSync(f, "utf8"); pages[rel] = h;
  const is404 = rel === "/404.html";
  const dec = (x) => x && x.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const title = dec((h.match(/<title>([^<]*)<\/title>/) || [])[1]); const desc = dec((h.match(/<meta name="description" content="([^"]*)"/) || [])[1]);
  const canon = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1]; const robots = (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || "";
  if (!title) bad(rel, "no title"); else { (titles[title] ||= []).push(rel); if (title.length > 65) bad(rel, `title ${title.length} chars`); }
  if (!desc) bad(rel, "no description"); else { (descs[desc] ||= []).push(rel); if (desc.length > 165 || desc.length < 70) bad(rel, `description ${desc.length} chars`); }
  if (mode === "live" && /noindex/.test(robots) && !is404) bad(rel, "noindex in live build");
  if (mode === "preview" && !/noindex/.test(robots)) bad(rel, "preview page missing noindex");
  if (!is404) { if (canon !== SITE + rel) bad(rel, `canonical ${canon}`); }
  const h1s = (h.match(/<h1[\s>]/g) || []).length; if (h1s !== 1) bad(rel, `${h1s} h1`);
  let last = 0; for (const m of h.matchAll(/<h([1-6])[\s>]/g)) { const l = +m[1]; if (last && l > last + 1) bad(rel, `heading skip h${last}->h${l}`); last = l; }
  for (const m of h.matchAll(/<img\b[^>]*>/g)) { imgs++; if (!/\balt="/.test(m[0])) bad(rel, `img without alt: ${m[0].slice(0, 80)}`); }
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); const arr = Array.isArray(j) ? j : j["@graph"] || [j]; for (const x of arr) [].concat(x["@type"]).forEach((t) => types.add(t)); } catch (e) { bad(rel, "JSON-LD parse error " + e.message); }
  }
  const og = (h.match(/<meta property="og:image" content="([^"]*)"/) || [])[1];
  if (!og) bad(rel, "no og:image"); else { const p = join(DIST, new URL(og).pathname); if (!existsSync(p)) bad(rel, `og:image missing file ${og}`); }
  if (!/<meta name="viewport"/.test(h)) bad(rel, "no viewport");
  if (rel !== rel.toLowerCase() || /[_ ]/.test(rel)) bad(rel, "unclean slug");
  for (const m of h.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, "&"); if (!href.startsWith("/") && !href.startsWith("#")) continue; links++;
    const [p0, hash] = href.split("#"); const p = (p0 || rel).split("?")[0];
    const target = p.endsWith("/") ? join(DIST, p, "index.html") : join(DIST, p);
    if (!existsSync(target)) { bad(rel, `broken internal link ${href}`); continue; }
    if (hash) { const th = p0 ? readFileSync(target, "utf8") : h; if (!new RegExp(`id="${hash}"`).test(th)) bad(rel, `missing anchor ${href}`); }
  }
}
for (const [t, ps] of Object.entries(titles)) if (ps.length > 1) bad(ps.join(","), `duplicate title "${t}"`);
for (const [t, ps] of Object.entries(descs)) if (ps.length > 1) bad(ps.join(","), `duplicate description`);
const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
if (mode === "live") { if (!/Allow: \//.test(robots) || /Disallow: \/\s*$/m.test(robots)) bad("robots.txt", "live robots not allowing"); if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) bad("robots.txt", "no sitemap line"); }
else if (!/Disallow: \/\s*$/m.test(robots)) bad("robots.txt", "preview robots should disallow");
const sm = readFileSync(join(DIST, "sitemap-0.xml"), "utf8"); const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const l of locs) if (!l.startsWith(SITE)) bad("sitemap", `wrong host ${l}`);
if (!/<lastmod>/.test(sm)) bad("sitemap", "no lastmod");
const indexable = Object.keys(pages).filter((p) => p !== "/404.html");
for (const p of indexable) if (!locs.includes(SITE + p)) bad("sitemap", `missing ${p}`);
// big images
const big = []; const walkAll = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = join(d, e.name); if (e.isDirectory()) walkAll(p); else if (/\.(jpe?g|png|webp|avif|gif)$/i.test(e.name) && statSync(p).size > 250000) big.push(`${relative(DIST, p)} ${(statSync(p).size / 1024) | 0}KB`); });
walkAll(DIST);
console.log(JSON.stringify({ mode, pages: files.length, sitemapUrls: locs.length, internalLinks: links, images: imgs, schemaTypes: [...types].sort(), imagesOver250KB: big, issues }, null, 1));
process.exitCode = issues.length ? 1 : 0;
