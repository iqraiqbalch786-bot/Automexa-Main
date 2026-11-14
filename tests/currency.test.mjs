import { test } from "node:test";
import assert from "node:assert/strict";
import { PRICES, pickCurrency, cookieCurrency, formatMoney, price, fill, fillBoth, moneyText, moneyHtml, setHtmlCurrency, budgetBands, priceValue } from "../src/lib/currency.mjs";
import { validateLead } from "../netlify/lib/lead-core.mjs";

test("currency selection: cookie beats country, UK and Crown Dependencies get GBP, others USD", () => {
  assert.equal(pickCurrency({ country: "GB" }), "GBP");
  assert.equal(pickCurrency({ country: "gb" }), "GBP");
  for (const c of ["IM", "JE", "GG"]) assert.equal(pickCurrency({ country: c }), "GBP");
  assert.equal(pickCurrency({ country: "US" }), "USD");
  assert.equal(pickCurrency({ country: "IE" }), "USD");
  assert.equal(pickCurrency({ country: "DE" }), "USD");
  assert.equal(pickCurrency({}), "USD");
  assert.equal(pickCurrency(), "USD");
  assert.equal(pickCurrency({ cookie: "USD", country: "GB" }), "USD");
  assert.equal(pickCurrency({ cookie: "GBP", country: "US" }), "GBP");
  assert.equal(pickCurrency({ cookie: "EUR", country: "US" }), "USD");
  assert.equal(pickCurrency({ cookie: "gbp", country: "GB" }), "GBP"); // bad cookie ignored, geo still applies
});

test("cookie parsing is exact", () => {
  assert.equal(cookieCurrency("a=1; amx_cur=GBP; b=2"), "GBP");
  assert.equal(cookieCurrency("amx_cur=USD"), "USD");
  assert.equal(cookieCurrency("xamx_cur=GBP"), null);
  assert.equal(cookieCurrency("amx_cur=GBPX"), null);
  assert.equal(cookieCurrency(""), null);
  assert.equal(cookieCurrency(null), null);
});

test("formatting", () => {
  assert.equal(formatMoney(2250, "USD"), "$2,250");
  assert.equal(formatMoney(1700, "GBP"), "£1,700");
  assert.equal(formatMoney(349, "USD"), "$349");
  assert.equal(formatMoney(0.35, "USD"), "$0.35");
  assert.equal(formatMoney(0.27, "GBP"), "27p");
  assert.equal(formatMoney(10000, "GBP"), "£10,000");
  assert.throws(() => formatMoney(1, "EUR"));
  assert.throws(() => price("nope", "USD"));
});

test("USD list matches the owner's published prices", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PRICES).map(([k, v]) => [k, v.USD])),
    { starter: 650, mexySetup: 1950, mexyMonthly: 650, budget1: 2500, budget2: 5000, budget3: 10000 },
  );
});

test("every GBP price is set, below the USD figure and within 70-85% of it", () => {
  for (const [k, v] of Object.entries(PRICES)) {
    assert.ok(v.GBP > 0, k);
    const r = v.GBP / v.USD;
    assert.ok(r > 0.7 && r < 0.85, `${k} ratio ${r}`);
  }
});

test("tokens: one currency, both, and HTML", () => {
  assert.equal(fill("From {{mexySetup}} in {{cur}}", "GBP"), "From £1,500 in GBP");
  assert.equal(fill("{{curLong}}", "USD"), "US dollars");
  assert.equal(fillBoth("Mexy {{mexySetup}}."), "Mexy $1,950 (£1,500 + VAT).");
  assert.equal(fillBoth("in {{cur}}"), "in USD or GBP");
  assert.equal(moneyHtml("mexyMonthly"), '<span class="cur-v" data-cur="USD">$650</span><span class="cur-v" data-cur="GBP" data-pagefind-ignore>£500</span>');
  const h = moneyText("Q&A <b> {{mexyMonthly}}/month");
  assert.ok(h.startsWith("Q&amp;A &lt;b&gt; "));
  assert.ok(h.includes(">$650<") && h.includes(">£500<") && h.endsWith("</span>/month"));
  assert.equal(moneyText("Quote"), "Quote");
});

test("edge rewrite sets data-currency on the html tag only", () => {
  const src = '<!doctype html><html lang="en-GB" data-currency="USD"><head></head><body><p data-currency="USD"></p></body></html>';
  const out = setHtmlCurrency(src, "GBP");
  assert.ok(out.includes('<html lang="en-GB" data-currency="GBP">'));
  assert.ok(out.includes('<p data-currency="USD">'));
  assert.ok(setHtmlCurrency("<html>", "GBP") === '<html data-currency="GBP">');
});

test("budget bands and lead validation accept both currencies", () => {
  assert.deepEqual(budgetBands("USD"), ["Under $2,500", "$2,500 to $5,000", "$5,000 to $10,000", "$10,000+"]);
  assert.deepEqual(budgetBands("GBP"), ["Under £2,000", "£2,000 to £4,000", "£4,000 to £7,500", "£7,500+"]);
  const base = { form: "discovery", name: "Ada", email: "ada@example.com", consent_privacy: true, elapsed_ms: 9000 };
  for (const b of [...budgetBands("USD"), ...budgetBands("GBP"), "Not sure yet"]) assert.equal(validateLead({ ...base, budget: b }).lead.budget, b);
});

test("JSON-LD values are plain numbers", () => {
  assert.equal(priceValue("mexySetup", "USD"), "1950");
  assert.equal(priceValue("mexySetup", "GBP"), "1500");
  assert.equal(priceValue("mexyMonthly", "GBP"), "500");
});

test("VAT: GBP-only phrases show in GBP, vanish in USD, and both-currency text marks GBP as + VAT", () => {
  const t = "From {{mexySetup}}{{gbp: + VAT}}, then {{mexyMonthly}} a month{{gbp:, plus VAT}}.";
  assert.equal(fill(t, "GBP"), "From £1,500 + VAT, then £500 a month, plus VAT.");
  assert.equal(fill(t, "USD"), "From $1,950, then $650 a month.");
  assert.equal(fillBoth(t), "From $1,950 (£1,500 + VAT), then $650 (£500 + VAT) a month.");
  const h = moneyText("{{mexyMonthly}}/month{{gbp: + VAT}}");
  assert.ok(h.endsWith('<span class="cur-v" data-cur="GBP" data-pagefind-ignore> + VAT</span>'));
  assert.ok(!h.includes('data-cur="USD"> + VAT'));
});

test("approved GBP list (Oct 2026), shown + VAT", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PRICES).map(([k, v]) => [k, v.GBP])),
    { starter: 500, mexySetup: 1500, mexyMonthly: 500, budget1: 2000, budget2: 4000, budget3: 7500 },
  );
  assert.equal(fill("from {{starter}}{{gbp: + VAT}}", "GBP"), "from £500 + VAT");
  assert.equal(fill("from {{starter}}{{gbp: + VAT}}", "USD"), "from $650");
  assert.equal(fillBoth("from {{starter}}"), "from $650 (£500 + VAT)");
});

test("Mexy demo line token: UK number for GBP, US number otherwise, both in JSON-LD text", async () => {
  const { MEXY_LINES } = await import("../src/lib/currency.mjs");
  assert.equal(MEXY_LINES.GBP.tel, "+441614827771");
  assert.equal(fill("Call {{mexyTel}}.{{usd: US}}{{gbp: UK}}", "GBP"), "Call +44 161 482 7771. UK");
  assert.equal(fill("Call {{mexyTel}}.{{usd: US}}{{gbp: UK}}", "USD"), "Call +1 505-422-4794. US");
  assert.equal(fillBoth("Call {{mexyTel}}.{{usd: US}}"), "Call +1 505-422-4794 (US) or +44 161 482 7771 (UK).");
});
