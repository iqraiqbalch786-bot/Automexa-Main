// Pure, dependency-free lead validation + helpers (unit-tested in tests/lead-core.test.mjs).
import { budgetBands } from "../../src/lib/currency.mjs";
export const FORMS = new Set(["discovery", "contact", "scorecard", "calculator"]);
export const INTERESTS = new Set(["AI receptionist (Mexy)", "Website or landing page", "Ads", "SEO / AEO / GEO", "Automation & CRM", "Automation, CRM & AI agents", "Brand & design", "Not sure yet"]);
// Form values in both currencies (current) plus the older en-dash labels for backward compatibility.
export const BUDGETS = new Set([...budgetBands("USD"), ...budgetBands("GBP"), "$2,500 – $5,000", "$5,000 – $10,000", "Not sure yet"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s.-]{7,40}$/;
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const clean = (v, max) => str(v, max).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

/** @returns {{ ok: true, lead: object } | { ok: false, status: number, error: string, fields?: Record<string,string>, spam?: boolean }} */
export function validateLead(body, { minElapsedMs = 2500 } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, status: 400, error: "Invalid request." };
  // Spam traps: honeypot filled or submitted faster than a human could type
  if (str(body.company_url, 300)) return { ok: false, status: 400, error: "Invalid request.", spam: true };
  const elapsed = Number(body.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed < minElapsedMs) return { ok: false, status: 400, error: "That was a little fast. Please try again.", spam: true };

  const fields = {};
  const form = FORMS.has(body.form) ? body.form : "discovery";
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40);
  if (!name) fields.name = "Please tell us your name.";
  if (!email) fields.email = "We need an email to reply to you.";
  else if (!EMAIL.test(email)) fields.email = "That email doesn't look right. Please check it.";
  if (phone && !PHONE.test(phone)) fields.phone = "Use digits, spaces and + only.";
  if (body.consent_privacy !== true) fields.consent_privacy = "Please confirm we can use your details to reply.";
  if (Object.keys(fields).length) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fields };

  const interests = Array.isArray(body.interests) ? [...new Set(body.interests.filter((i) => INTERESTS.has(i)))] : [];
  const budget = BUDGETS.has(body.budget) ? body.budget : null;
  const utm = {};
  if (body.utm && typeof body.utm === "object") for (const [k, v] of Object.entries(body.utm).slice(0, 12)) if (/^[a-z_]{2,20}$/.test(k)) utm[k] = clean(String(v), 200);
  const details = {};
  if (body.details && typeof body.details === "object") for (const [k, v] of Object.entries(body.details).slice(0, 8)) if (/^[a-z_]{2,20}$/.test(k) && v != null) details[k] = clean(String(v), 120);

  return {
    ok: true,
    lead: {
      form, name, email, phone: phone || null,
      company: clean(body.company, 160) || null,
      website: clean(body.website, 300) || null,
      interests, budget,
      message: clean(body.message, 4000) || null,
      details, utm,
      page: clean(body.page, 300) || null,
      referrer: clean(body.referrer, 500) || null,
      consent_privacy: true,
      marketing_opt_in: body.marketing_opt_in === true,
      is_test: /@(example\.(com|org|net)|automexa-test\.invalid)$/.test(email),
    },
  };
}

export function originAllowed(origin, allowedCsv, selfOrigin) {
  if (!origin) return true; // same-origin form posts from some browsers omit Origin
  const allowed = new Set(String(allowedCsv || "").split(",").map((s) => s.trim()).filter(Boolean));
  if (selfOrigin) allowed.add(selfOrigin);
  return allowed.has(origin);
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function notificationEmail(lead, id) {
  const rows = [
    ["Name", lead.name], ["Email", lead.email], ["Phone", lead.phone], ["Business", lead.company], ["Website", lead.website],
    ["Interested in", lead.interests.join(", ")], ["Budget", lead.budget], ["Message", lead.message],
    ["Form / page", `${lead.form} · ${lead.page || ""}`], ["Marketing opt-in", lead.marketing_opt_in ? "Yes" : "No"],
    ["Source", Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" ") || lead.referrer || "direct"], ["Lead ID", id],
  ].filter(([, v]) => v);
  const subject = `${lead.is_test ? "[TEST] " : ""}New enquiry: ${lead.name}${lead.company ? ` (${lead.company})` : ""}`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0c0e0d"><h2 style="margin:0 0 12px">New website enquiry</h2><table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#5a615c;vertical-align:top">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table><p style="color:#5a615c;font-size:13px">Reply directly to this email to answer ${esc(lead.name)}.</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject, html, text };
}
