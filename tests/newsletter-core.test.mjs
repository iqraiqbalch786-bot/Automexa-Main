import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSignup, CONSENT_TEXT } from "../netlify/lib/newsletter-core.mjs";
const ok = { email: "  Jo@Example.com ", consent: true, elapsed_ms: 4000, page: "/", utm: { utm_source: "x", "BAD KEY": "y" } };
test("valid sign-up is normalised and keeps the consent wording", () => {
  const r = validateSignup(ok); assert.equal(r.ok, true);
  assert.equal(r.sub.email, "jo@example.com"); assert.equal(r.sub.consent_text, CONSENT_TEXT); assert.equal(r.sub.is_test, true);
  assert.deepEqual(r.sub.utm, { utm_source: "x" });
});
test("consent is required", () => { const r = validateSignup({ ...ok, consent: "yes" }); assert.equal(r.ok, false); assert.equal(r.field, "consent"); });
test("bad email rejected", () => { const r = validateSignup({ ...ok, email: "nope" }); assert.equal(r.ok, false); assert.equal(r.field, "email"); });
test("honeypot and timing traps", () => {
  assert.equal(validateSignup({ ...ok, company_url: "x" }).spam, true);
  assert.equal(validateSignup({ ...ok, elapsed_ms: 200 }).spam, true);
});
