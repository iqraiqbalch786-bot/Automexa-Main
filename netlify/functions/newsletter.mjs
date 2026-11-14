/**
 * POST /api/newsletter : stores a newsletter sign-up with its consent record.
 * Storage: Supabase (prod project) via the token-gated SECURITY DEFINER RPC submit_marketing_newsletter.
 * Same security model as /api/lead: public key + ingest token only, origin allow-list, honeypot, timing, IP-hash rate limit.
 */
import { createHash } from "node:crypto";
import { validateSignup } from "../lib/newsletter-core.mjs";
import { originAllowed } from "../lib/lead-core.mjs";

const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : process.env[k]) || "";
function json(status, body, origin) {
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (origin) { h["access-control-allow-origin"] = origin; h["vary"] = "Origin"; }
  return new Response(JSON.stringify(body), { status, headers: h });
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
  if (raw.length > 4000) return json(413, { ok: false, error: "Request too large." }, corsOrigin);
  let body; try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "Invalid request." }, corsOrigin); }

  const v = validateSignup(body);
  if (!v.ok) return json(v.status, { ok: false, error: v.error, field: v.field }, corsOrigin);

  const SUPABASE_URL = env("SUPABASE_URL"), KEY = env("SUPABASE_PUBLISHABLE_KEY"), TOKEN = env("LEAD_INGEST_TOKEN");
  if (!SUPABASE_URL || !KEY || !TOKEN) { console.error("newsletter: storage not configured"); return json(503, { ok: false, error: "Sign-up is temporarily unavailable." }, corsOrigin); }
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "";
  const ip_hash = ip ? createHash("sha256").update(`${env("LEAD_IP_SALT")}|${ip}`).digest("hex").slice(0, 32) : null;
  const sub = { ...v.sub, ip_hash, user_agent: (req.headers.get("user-agent") || "").slice(0, 400) };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_marketing_newsletter`, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify({ p_token: TOKEN, p_sub: sub }) });
  const out = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = out && typeof out === "object" ? out.message : "";
    if (msg === "rate_limited") return json(429, { ok: false, error: "Too many sign-ups from here. Please try again in a few minutes." }, corsOrigin);
    console.error("newsletter: store failed", r.status, msg);
    return json(502, { ok: false, error: "We couldn't save your sign-up." }, corsOrigin);
  }
  return json(201, { ok: true, id: typeof out === "string" ? out : null }, corsOrigin);
};

export const config = { path: "/api/newsletter" };
