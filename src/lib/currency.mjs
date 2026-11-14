// Currency: one price list, two currencies. Pure and dependency-free so the Astro build, the Netlify
// edge function (netlify/edge-functions/currency.ts) and the unit tests (tests/currency.test.mjs) share it.
//
// GBP prices are fixed, rounded figures set by hand from the USD list (not a live conversion).
// Basis: ECB reference rate via Frankfurter, 2026-10-08, 1 USD = 0.75718 GBP. See /workspace/automexa-gbp-prices.md.

/** @typedef {"USD" | "GBP"} Currency */

export const CURRENCIES = /** @type {const} */ (["USD", "GBP"]);
export const DEFAULT_CURRENCY = "USD";
export const COOKIE = "amx_cur";
/** Visitors in these countries see GBP. Everyone else sees USD. */
export const GBP_COUNTRIES = new Set(["GB", "IM", "JE", "GG"]);

/** Every price shown on the site. Change a figure here and every page, FAQ and JSON-LD offer follows. */
export const PRICES = {
  starter: { USD: 650, GBP: 500 }, // Simple Website (Barry, Oct 15 2026)
  mexySetup: { USD: 1950, GBP: 1500 }, // Mexy with CRM, one-time setup (Barry, Oct 15 2026)
  mexyMonthly: { USD: 650, GBP: 500 }, // Mexy with CRM, per month (Barry, Oct 15 2026)
  // Contact-form budget band edges
  budget1: { USD: 2500, GBP: 2000 },
  budget2: { USD: 5000, GBP: 4000 },
  budget3: { USD: 10000, GBP: 7500 },
};
/** @typedef {keyof typeof PRICES} PriceKey */

export const isCurrency = (v) => v === "USD" || v === "GBP";

/**
 * Which currency to show. A saved choice (cookie) wins, then the visitor's country, then USD.
 * @param {{ cookie?: string | null, country?: string | null }} [o]
 * @returns {Currency}
 */
export function pickCurrency({ cookie, country } = {}) {
  if (isCurrency(cookie)) return cookie;
  if (country && GBP_COUNTRIES.has(String(country).toUpperCase())) return "GBP";
  return DEFAULT_CURRENCY;
}

/** Read the amx_cur value out of a Cookie header (or document.cookie). */
export function cookieCurrency(header) {
  const m = /(?:^|;\s*)amx_cur=(USD|GBP)(?:;|$)/.exec(header || "");
  return m ? /** @type {Currency} */ (m[1]) : null;
}

/**
 * Format an amount: $1,950 / £1,500, $0.35 / 27p. Whole amounts get no decimals.
 * @param {number} amount @param {Currency} cur
 */
export function formatMoney(amount, cur) {
  if (!isCurrency(cur)) throw new Error(`Unknown currency ${cur}`);
  if (amount < 1 && cur === "GBP") return `${Math.round(amount * 100)}p`;
  const whole = Number.isInteger(amount);
  const n = amount.toLocaleString("en-GB", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  return `${cur === "GBP" ? "£" : "$"}${n}`;
}

/** @param {PriceKey} key @param {Currency} cur */
export function price(key, cur) {
  const p = PRICES[key];
  if (!p) throw new Error(`Unknown price key ${key}`);
  return formatMoney(p[cur], cur);
}

/** Plain number for JSON-LD offers ("1950", "500"). */
export function priceValue(key, cur) {
  return String(PRICES[key][cur]);
}

const NAMES = { USD: { short: "USD", long: "US dollars" }, GBP: { short: "GBP", long: "pounds sterling" } };
/** @param {Currency} cur @param {"short" | "long"} [form] */
export const currencyName = (cur, form = "short") => NAMES[cur][form];

// Tokens inside copy strings:
//   {{starter}}, {{mexyMonthly}}, ...  a price from PRICES
//   {{cur}} USD/GBP, {{curLong}} US dollars/pounds sterling
//   {{gbp:TEXT}} TEXT only in GBP mode, e.g. "{{gbp: + VAT}}" (UK prices exclude VAT; USD prices carry no VAT label)
//   {{usd:TEXT}} TEXT only in USD mode
//   {{mexyTel}}  the Mexy demo line: UK 0161 number for GBP visitors, US number for everyone else
const TOKEN = /\{\{(\w+)(?::([^}]*))?\}\}/g;
export const VAT = " + VAT";
/** Mexy demo lines. GBP (UK) visitors see the Manchester number; everyone else the US number. */
export const MEXY_LINES = {
  USD: { display: "+1 505-422-4794", tel: "+15054224794", intl: "+1 505-422-4794", label: "US line" },
  GBP: { display: "+44 161 482 7771", tel: "+441614827771", intl: "+44 161 482 7771", label: "UK line" },
};
const tokenText = (key, cur, arg = "") =>
  key === "gbp" ? (cur === "GBP" ? arg : "") : key === "usd" ? (cur === "USD" ? arg : "") : key === "mexyTel" ? MEXY_LINES[cur].display : key === "cur" ? currencyName(cur) : key === "curLong" ? currencyName(cur, "long") : price(key, cur);

/** Resolve tokens for one currency. */
export function fill(text, cur) {
  return text.replace(TOKEN, (_, k, a) => tokenText(k, cur, a));
}

/**
 * Resolve tokens with both currencies, for meta descriptions, JSON-LD and AI answers: "$1,950 (£1,500 + VAT)".
 * GBP figures always carry "+ VAT" here, so GBP-only phrases ({{gbp:...}}) are dropped.
 */
export function fillBoth(text) {
  return text.replace(TOKEN, (_, k) =>
    k === "gbp" || k === "usd" ? "" : k === "mexyTel" ? `${MEXY_LINES.USD.display} (US) or ${MEXY_LINES.GBP.display} (UK)` : k === "cur" || k === "curLong" ? `${tokenText(k, "USD")} or ${tokenText(k, "GBP")}` : `${tokenText(k, "USD")} (${tokenText(k, "GBP")}${VAT})`);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markup for one token: both currencies, CSS shows the one matching <html data-currency>. */
export function moneyHtml(key, arg = "") {
  if (key === "gbp") return arg ? `<span class="cur-v" data-cur="GBP" data-pagefind-ignore>${esc(arg)}</span>` : "";
  if (key === "usd") return arg ? `<span class="cur-v" data-cur="USD">${esc(arg)}</span>` : "";
  return `<span class="cur-v" data-cur="USD">${esc(tokenText(key, "USD"))}</span><span class="cur-v" data-cur="GBP" data-pagefind-ignore>${esc(tokenText(key, "GBP"))}</span>`;
}

/** Escape a copy string and swap its tokens for dual-currency markup. */
export function moneyText(text) {
  let out = "", last = 0;
  for (const m of text.matchAll(TOKEN)) {
    out += esc(text.slice(last, m.index)) + moneyHtml(m[1], m[2] || "");
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

export const hasTokens = (text) => /\{\{\w+(?::[^}]*)?\}\}/.test(text);

/** Set data-currency on the <html> tag of a page (edge function). Only touches the first <html ...> tag. */
export function setHtmlCurrency(html, cur) {
  return html.replace(/<html\b([^>]*)>/i, (tag, attrs) => {
    const clean = attrs.replace(/\sdata-currency="[^"]*"/i, "");
    return `<html${clean} data-currency="${cur}">`;
  });
}

/** Contact-form budget options in one currency. Labels double as submitted values. */
export function budgetBands(cur) {
  const a = price("budget1", cur), b = price("budget2", cur), c = price("budget3", cur);
  return [`Under ${a}`, `${a} to ${b}`, `${b} to ${c}`, `${c}+`];
}
