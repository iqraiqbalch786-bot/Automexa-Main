/**
 * POST /api/lead : stores a marketing lead and sends an email alert.
 * Storage: Supabase (prod project) via the token-gated SECURITY DEFINER RPC submit_marketing_lead.
 *          This function never holds a service-role key; it only has the public key + an ingest token
 *          that can do nothing except insert marketing leads.
 * Email:   Resend (optional; the lead is still stored if email fails).
 */
import { createHash } from "node:crypto";
import { validateLead, originAllowed, notificationEmail } from "../lib/lead-core.mjs";

const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : process.env[k]) || "";

function json(status, body, origin) {
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (origin) { h["access-control-allow-origin"] = origin; h["vary"] = "Origin"; }
  return new Response(JSON.stringify(body), { status, headers: h });
}

async function verifyTurnstile(token, ip) {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not configured: honeypot + timing + rate limit still apply
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip || "" }) });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

export default async (req, context) => {
  const origin = req.headers.get("origin") || "";
  const self = new URL(req.url).origin;
  const okOrigin = originAllowed(origin, env("ALLOWED_ORIGINS"), self);
  const corsOrigin = okOrigin && origin ? origin : null;

  if (req.method === "OPTIONS") {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": origin || self, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "600", vary: "Origin" } });
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, corsOrigin);
  if (!okOrigin) return json(403, { ok: false, error: "Forbidden." });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return json(415, { ok: false, error: "Send JSON." }, corsOrigin);

  const raw = await req.text();
  if (raw.length > 12_000) return json(413, { ok: false, error: "That message is too long." }, corsOrigin);
  let body; try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "Invalid request." }, corsOrigin); }

  const v = validateLead(body);
  if (!v.ok) { if (v.spam) console.warn("lead spam-trap", { reason: v.error }); return json(v.status, { ok: false, error: v.error, fields: v.fields }, corsOrigin); }

  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "";
  if (!(await verifyTurnstile(body.turnstile, ip))) return json(400, { ok: false, error: "Please complete the spam check." }, corsOrigin);

  const SUPABASE_URL = env("SUPABASE_URL"), KEY = env("SUPABASE_PUBLISHABLE_KEY"), TOKEN = env("LEAD_INGEST_TOKEN");
  if (!SUPABASE_URL || !KEY || !TOKEN) { console.error("lead: storage not configured"); return json(503, { ok: false, error: "Our form is temporarily unavailable." }, corsOrigin); }

  const ip_hash = ip ? createHash("sha256").update(`${env("LEAD_IP_SALT")}|${ip}`).digest("hex").slice(0, 32) : null;
  const lead = { ...v.lead, ip_hash, user_agent: (req.headers.get("user-agent") || "").slice(0, 400) };
  const rpc = (fn, args) => fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify(args) });

  const r = await rpc("submit_marketing_lead", { p_token: TOKEN, p_lead: lead });
  const out = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = out && typeof out === "object" ? out.message : "";
    if (msg === "rate_limited") return json(429, { ok: false, error: "Too many requests. Please wait a few minutes or call us." }, corsOrigin);
    console.error("lead: store failed", r.status, msg);
    return json(502, { ok: false, error: "We couldn't save your request." }, corsOrigin);
  }
  const id = typeof out === "string" ? out : null;

  // Email alert (best effort; the lead is already stored)
  let notified = false;
  const RESEND = env("RESEND_API_KEY"), TO = env("LEAD_NOTIFY_TO"), FROM = env("LEAD_NOTIFY_FROM");
  if (RESEND && TO && FROM) {
    try {
      const m = notificationEmail(lead, id);
      const er = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" }, body: JSON.stringify({ from: FROM, to: TO.split(",").map((s) => s.trim()), reply_to: lead.email, subject: m.subject, html: m.html, text: m.text }) });
      notified = er.ok;
      if (!er.ok) console.error("lead: email failed", er.status, (await er.text()).slice(0, 200));
      else if (id) await rpc("mark_marketing_lead_notified", { p_token: TOKEN, p_id: id });
    } catch (e) { console.error("lead: email error", String(e).slice(0, 200)); }
  }
  return json(201, { ok: true, id, notified }, corsOrigin);
};

export const config = { path: "/api/lead" };
