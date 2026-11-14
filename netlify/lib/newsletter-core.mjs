// Pure, dependency-free newsletter validation (unit-tested in tests/newsletter-core.test.mjs).
export const CONSENT_TEXT = "Yes, email me Automexa's growth ideas. I can unsubscribe at any time.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const clean = (v, max) => str(v, max).replace(/[\u0000-\u001F\u007F]/g, "");

/** @returns {{ ok: true, sub: object } | { ok: false, status: number, error: string, field?: string, spam?: boolean }} */
export function validateSignup(body, { minElapsedMs = 1500 } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, status: 400, error: "Invalid request." };
  if (str(body.company_url, 300)) return { ok: false, status: 400, error: "Invalid request.", spam: true };
  const elapsed = Number(body.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed < minElapsedMs) return { ok: false, status: 400, error: "That was a little fast. Please try again.", spam: true };
  const email = clean(body.email, 254).toLowerCase();
  if (!email) return { ok: false, status: 400, error: "Please enter your email address.", field: "email" };
  if (!EMAIL.test(email)) return { ok: false, status: 400, error: "That email doesn't look right. Please check it.", field: "email" };
  if (body.consent !== true) return { ok: false, status: 400, error: "Please tick the box to confirm you want our emails.", field: "consent" };
  const utm = {};
  if (body.utm && typeof body.utm === "object") for (const [k, v] of Object.entries(body.utm).slice(0, 12)) if (/^[a-z_]{2,20}$/.test(k)) utm[k] = clean(String(v), 200);
  return {
    ok: true,
    sub: {
      email,
      consent: true,
      consent_text: CONSENT_TEXT,
      source: clean(body.source, 40) || "footer",
      page: clean(body.page, 300) || null,
      referrer: clean(body.referrer, 500) || null,
      utm,
      is_test: /@(example\.(com|org|net)|automexa-test\.invalid)$/.test(email),
    },
  };
}
