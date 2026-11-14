/**
 * Campaign attribution without storing anything on the device (PECR-friendly, no consent needed):
 * - reads UTM/click IDs from the landing URL plus the external referrer host,
 * - carries them across internal pages by appending them to internal links, but ONLY for visitors who
 *   arrived with them (crawlers and normal visitors never see tagged internal URLs; canonicals stay clean),
 * - forms read getAttribution() / getReferrer() and send them with the submission.
 * With analytics consent, analytics.ts additionally keeps a first-touch copy in sessionStorage.
 */
export const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"] as const;
const REF = "amx_ref";

function externalReferrerHost(): string {
  try {
    if (!document.referrer) return "";
    const u = new URL(document.referrer);
    return u.host && u.host !== location.host ? u.host.slice(0, 120) : "";
  } catch { return ""; }
}

/** Attribution params present on this page's URL (plus the external referrer host, if any). */
export function getAttribution(): Record<string, string> {
  const q = new URLSearchParams(location.search);
  const out: Record<string, string> = {};
  KEYS.forEach((k) => { const v = q.get(k); if (v) out[k] = v.slice(0, 120); });
  const ref = q.get(REF) || externalReferrerHost();
  if (ref) out.ref = ref.slice(0, 120);
  return out;
}

/** Best external referrer we know of for this visit (host only, never a full URL). */
export function getReferrer(): string | null {
  return new URLSearchParams(location.search).get(REF) || externalReferrerHost() || null;
}

/** Append the visitor's own campaign params to internal links so a later form still knows the source. */
export function initAttribution() {
  const a = getAttribution();
  if (!Object.keys(a).length) return;
  const carry = new URLSearchParams();
  KEYS.forEach((k) => a[k] && carry.set(k, a[k]));
  if (a.ref) carry.set(REF, a.ref);
  const tag = (link: HTMLAnchorElement) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let u: URL; try { u = new URL(href, location.href); } catch { return; }
    if (u.origin !== location.origin || u.pathname.startsWith("/api/") || /\.(png|jpe?g|webp|avif|svg|pdf|xml|txt|mp4|webm)$/i.test(u.pathname)) return;
    carry.forEach((v, k) => { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
    link.setAttribute("href", u.pathname + u.search + u.hash);
  };
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(tag);
  // Links added later (e.g. search results)
  document.addEventListener("pointerdown", (e) => { const l = (e.target as Element).closest?.("a[href]"); if (l) tag(l as HTMLAnchorElement); }, { capture: true });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter") { const l = (document.activeElement as Element)?.closest?.("a[href]"); if (l) tag(l as HTMLAnchorElement); } }, { capture: true });
}
