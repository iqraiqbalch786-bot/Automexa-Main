// Visitor currency (USD or GBP). The server side lives in netlify/edge-functions/currency.ts, which sets
// <html data-currency> from the saved choice or the visitor's country before the page leaves the CDN.
// Here: keep switches, budget options and listeners in step, and save a manual choice in the amx_cur cookie.
import { COOKIE, isCurrency, type Currency } from "../lib/currency.mjs";

export const EVENT = "amx:currency";
export const getCurrency = (): Currency => (document.documentElement.dataset.currency === "GBP" ? "GBP" : "USD");

const sync = (cur: Currency) => {
  document.querySelectorAll<HTMLInputElement>("[data-cur-switch] input[type=radio]").forEach((r) => (r.checked = r.value === cur));
  // Budget bands in the contact form: swap label and submitted value; keep the visitor's band if one was picked.
  document.querySelectorAll<HTMLOptionElement>("option[data-usd]").forEach((o) => {
    const v = cur === "GBP" ? o.dataset.gbp! : o.dataset.usd!;
    o.textContent = v; o.value = v;
  });
};

export function setCurrency(cur: Currency, save = true) {
  if (!isCurrency(cur)) return;
  document.documentElement.dataset.currency = cur;
  if (save) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE}=${cur}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }
  sync(cur);
  document.dispatchEvent(new CustomEvent(EVENT, { detail: { currency: cur } }));
}

export function initCurrency() {
  sync(getCurrency());
  document.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t?.matches?.("[data-cur-switch] input[type=radio]") && t.checked && isCurrency(t.value)) setCurrency(t.value as Currency);
  });
  // Back/forward cache can restore a page with an older choice: re-read the cookie when shown again.
  addEventListener("pageshow", (e) => {
    if (!(e as PageTransitionEvent).persisted) return;
    const m = /(?:^|;\s*)amx_cur=(USD|GBP)/.exec(document.cookie);
    if (m && m[1] !== getCurrency()) setCurrency(m[1] as Currency, false);
  });
}
