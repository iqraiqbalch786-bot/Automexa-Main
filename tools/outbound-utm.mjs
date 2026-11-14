// Astro integration: after build, tag outbound links in the generated HTML with UTMs
// so partner sites see Automexa as the referral source (utm_content = page slug).
// Excluded: government/regulator links, WhatsApp, standards sites, tel:/mailto:, links that already have UTMs.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDE = [/(^|\.)gov\.uk$/, /(^|\.)ico\.org\.uk$/, /(^|\.)wa\.me$/, /(^|\.)whatsapp\.com$/, /(^|\.)schema\.org$/, /(^|\.)w3\.org$/];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else if (e.name.endsWith(".html")) yield p;
  }
}

export function tagUrl(href, ownHost, slug) {
  let u;
  try { u = new URL(href.replace(/&amp;/g, "&")); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === ownHost || EXCLUDE.some((r) => r.test(host))) return null;
  if ([...u.searchParams.keys()].some((k) => k.startsWith("utm_"))) return null;
  u.searchParams.set("utm_source", "automexa.co.uk");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", "site_link");
  u.searchParams.set("utm_content", slug);
  return u.toString().replace(/&/g, "&amp;");
}

export default function outboundUtm() {
  let site = "https://automexa.co.uk";
  return {
    name: "automexa-outbound-utm",
    hooks: {
      "astro:config:done": ({ config }) => { if (config.site) site = config.site; },
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const ownHost = new URL(site).hostname.replace(/^www\./, "");
        let n = 0;
        for await (const file of walk(root)) {
          const rel = relative(root, file).split(sep).join("/").replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "");
          const slug = rel ? rel.replace(/\//g, "-") : "home";
          const html = await readFile(file, "utf8");
          const out = html.replace(/(<a\b[^>]*?\bhref=)(["'])(https?:\/\/[^"']+)\2/gi, (m, pre, q, href) => {
            const t = tagUrl(href, ownHost, slug);
            if (!t) return m;
            n++; return `${pre}${q}${t}${q}`;
          });
          if (out !== html) await writeFile(file, out);
        }
        logger.info(`tagged ${n} outbound links with UTMs`);
      },
    },
  };
}
