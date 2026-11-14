import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLead, originAllowed, notificationEmail } from "../netlify/lib/lead-core.mjs";
const good = { form: "discovery", name: "Ada", email: "Ada@Example.com", consent_privacy: true, elapsed_ms: 9000, interests: ["Ads", "bogus"], budget: "$10,000+" };

test("accepts a valid lead and normalises it", () => {
  const r = validateLead(good);
  assert.equal(r.ok, true);
  assert.equal(r.lead.email, "ada@example.com");
  assert.deepEqual(r.lead.interests, ["Ads"]);
  assert.equal(r.lead.is_test, true);
});
test("rejects honeypot and too-fast submissions as spam", () => {
  assert.equal(validateLead({ ...good, company_url: "http://x" }).spam, true);
  assert.equal(validateLead({ ...good, elapsed_ms: 500 }).spam, true);
});
test("field errors", () => {
  const r = validateLead({ ...good, name: " ", email: "nope", phone: "abc", consent_privacy: false });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.fields).sort(), ["consent_privacy", "email", "name", "phone"]);
});
test("unknown form falls back to discovery, unknown budget dropped", () => {
  const r = validateLead({ ...good, form: "x", budget: "a million" });
  assert.equal(r.lead.form, "discovery"); assert.equal(r.lead.budget, null);
});
test("origin allowlist is exact", () => {
  assert.equal(originAllowed("https://automexa.co.uk", "https://automexa.co.uk", "https://p.netlify.app"), true);
  assert.equal(originAllowed("https://automexa.co.uk.evil.com", "https://automexa.co.uk", "https://p.netlify.app"), false);
  assert.equal(originAllowed("https://p.netlify.app", "", "https://p.netlify.app"), true);
});
test("notification email escapes HTML", () => {
  const r = validateLead({ ...good, name: "<script>x</script>" });
  const m = notificationEmail(r.lead, "id1");
  assert.ok(!m.html.includes("<script>")); assert.ok(m.subject.startsWith("[TEST]"));
});
