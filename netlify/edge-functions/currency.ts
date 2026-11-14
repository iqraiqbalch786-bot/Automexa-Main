// Visitor currency on the server, so prices are right on first paint with no flash.
// Every HTML page carries both prices; this sets <html data-currency="GBP|USD"> and CSS shows one.
// Order: saved choice (amx_cur cookie) > visitor country (Netlify geo: GB, IM, JE, GG -> GBP) > USD.
//
// Caching: Netlify caches the static page (identical for everyone) and runs this function on every request
// (no `cache: "manual"`), so a cached page is never reused across currencies. Browser revalidation is
// currency-aware: the ETag gets a ~USD / ~GBP suffix, and the origin may only answer 304 when the currency
// of the cached copy matches the currency for this request.
import type { Config, Context } from "@netlify/edge-functions";
import { cookieCurrency, pickCurrency, setHtmlCurrency } from "../../src/lib/currency.mjs";

const SUFFIX = /^(W\/)?"(.*)~(USD|GBP)"$/;

export default async (req: Request, context: Context) => {
  const saved = cookieCurrency(req.headers.get("cookie"));
  const country = context.geo?.country?.code ?? null;
  const cur = pickCurrency({ cookie: saved, country });
  const source = saved ? "cookie" : country ? "geo" : "default";

  // Conditional request: forward the plain ETag only if the browser's copy is in the same currency.
  let fwd: Request | undefined;
  const inm = req.headers.get("if-none-match");
  if (inm) {
    const h = new Headers(req.headers);
    const m = SUFFIX.exec(inm.trim());
    if (m && m[3] === cur) h.set("if-none-match", `${m[1] ?? ""}"${m[2]}"`);
    else h.delete("if-none-match");
    fwd = new Request(req, { headers: h });
  }

  const res = await context.next(fwd);
  const type = res.headers.get("content-type") || "";
  if (res.status !== 304 && !type.includes("text/html")) return res;

  const headers = new Headers(res.headers);
  const etag = headers.get("etag");
  if (etag) headers.set("etag", etag.replace(/"$/, `~${cur}"`));
  headers.set("x-amx-currency", `${cur}; source=${source}`);
  headers.append("vary", "Cookie");
  if (res.status === 304 || !res.body) return new Response(null, { status: res.status, headers });

  const html = await res.text();
  headers.delete("content-length");
  return new Response(setHtmlCurrency(html, cur), { status: res.status, statusText: res.statusText, headers });
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/_astro/*", "/fonts/*", "/og/*", "/icons/*", "/work/*.mp4", "/work/video/*", "/audio/*", "/pagefind/*", "/api/*", "/*.xml", "/*.txt", "/*.svg", "/*.ico", "/*.png", "/*.jpg", "/*.webp", "/*.js", "/*.css", "/*.webmanifest", "/*.woff2"],
  onError: "bypass", // if this ever fails, the page still serves (in USD)
};
