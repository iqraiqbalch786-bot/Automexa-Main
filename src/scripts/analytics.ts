/**
 * Consent-gated analytics.
 * - Nothing non-essential is loaded or stored until the visitor accepts.
 * - Provider is chosen by env at build time: PUBLIC_PLAUSIBLE_DOMAIN or PUBLIC_GA4_ID. If neither is set,
 *   events are only kept in an in-memory queue (window.__amxEvents) so they can be verified in tests.
 * - GA4 is loaded with Consent Mode v2 defaults set to "denied" and updated on accept.
 */
import { getAttribution as urlAttribution } from "./attribution";
type Props = Record<string, string | number | boolean | undefined>;
const KEY = "amx-consent-v1"; // stores only "granted" | "denied" (strictly necessary to remember the choice)
const PLAUSIBLE = import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN as string | undefined;
const GA4 = import.meta.env.PUBLIC_GA4_ID as string | undefined;

declare global { interface Window { __amxEvents: { name: string; props: Props }[]; dataLayer: unknown[]; gtag?: (...a: unknown[]) => void; plausible?: (e: string, o?: { props?: Props }) => void; amxTrack: (n: string, p?: Props) => void; } }
window.__amxEvents = window.__amxEvents || [];

export const getConsent = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
let loaded = false;

function loadScript(src: string, attrs: Record<string, string> = {}) {
  const s = document.createElement("script");
  s.src = src; s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function loadProvider() {
  if (loaded) return; loaded = true;
  if (PLAUSIBLE) {
    window.plausible = window.plausible || function (...a: unknown[]) { ((window.plausible as unknown as { q: unknown[] }).q = (window.plausible as unknown as { q: unknown[] }).q || []).push(a); };
    loadScript("https://plausible.io/js/script.tagged-events.js", { "data-domain": PLAUSIBLE, defer: "" });
  } else if (GA4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", GA4, { anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4)}`);
  }
}

export function track(name: string, props: Props = {}) {
  const p = { page: location.pathname, ...props };
  window.__amxEvents.push({ name, props: p });
  if (getConsent() !== "granted") return;
  if (PLAUSIBLE && window.plausible) window.plausible(name, { props: p });
  else if (GA4 && window.gtag) window.gtag("event", name, p);
}
window.amxTrack = track;

export function setConsent(v: "granted" | "denied") {
  try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
  if (v === "granted") loadProvider();
  else if (GA4 && window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
  hideBanner();
}

const banner = () => document.querySelector<HTMLElement>("[data-consent]");
function hideBanner() { const b = banner(); if (b) b.hidden = true; document.documentElement.classList.remove("consent-open"); }
function showBanner() { const b = banner(); if (b) { b.hidden = false; document.documentElement.classList.add("consent-open"); } }

export function initAnalytics() {
  const c = getConsent();
  if (c === "granted") loadProvider();
  else if (c === null) showBanner();
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const choice = t.closest<HTMLElement>("[data-consent-choice]");
    if (choice) { setConsent(choice.dataset.consentChoice as "granted" | "denied"); return; }
    if (t.closest("[data-consent-open]")) { showBanner(); banner()?.querySelector<HTMLElement>("button")?.focus(); return; }
    const el = t.closest<HTMLElement>("[data-track]");
    if (el) track(el.dataset.track!, { location: el.dataset.loc, label: (el.textContent || "").trim().slice(0, 60) || undefined, number: el.getAttribute("href")?.startsWith("tel:") ? el.getAttribute("href")!.slice(4) : undefined });
  });
}

/**
 * Attribution for form submissions. Always: UTMs/click IDs on the current URL (carried across pages by
 * attribution.ts) plus the external referrer host. Only with analytics consent: a first-touch copy kept in
 * sessionStorage so it survives untagged navigation.
 */
export function getAttribution(): Record<string, string> {
  const fromUrl = urlAttribution();
  if (getConsent() !== "granted") return fromUrl;
  try {
    const stored = JSON.parse(sessionStorage.getItem("amx-ft") || "null");
    if (stored && typeof stored === "object") return { ...stored, ...fromUrl };
    const ft = { ...fromUrl, landing: location.pathname };
    sessionStorage.setItem("amx-ft", JSON.stringify(ft));
    return ft;
  } catch { return fromUrl; }
}
