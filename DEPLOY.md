# Deploying the Automexa site

Status: **live** on https://automexa.co.uk as of 8 Oct 2026. Latest production deploy `6aca5e449108bd6571c94a8b` (10 Oct 2026); rollback `6ac81dd9e0c9024a8068e5f8`. Production Netlify site `automexa`, id `70b25969-b437-44e9-b9a2-ee5941d6c9f7` (`https://automexa.netlify.app`). The preview site is unchanged and still noindex.

- Preview: https://automexa-preview.netlify.app (Netlify site `automexa-preview`, id `80a154e1-ec6b-4c34-9fe9-b4050b3b6723`). It is a separate site from the Mexy app and from production.
- DNS rollback (apex A and www CNAME only): `/workspace/automexa-golive/rollback-dns.sh`
- The preview is built with `PUBLIC_NOINDEX=true`. That adds `noindex, nofollow` and a disallow-all `robots.txt`.

## Build commands

```bash
export PATH=~/.local/node22/bin:$PATH   # Astro 7 needs Node >= 22.12
npm ci
npm test                 # lead validation unit tests
npm run build:preview    # preview: PUBLIC_SITE_URL=preview URL, PUBLIC_NOINDEX=true
npm run build:live       # live: PUBLIC_SITE_URL=https://automexa.co.uk, indexable
```

Always use the npm scripts. `build:live` sets `PUBLIC_NOINDEX=false` itself, so a stray exported variable can't make the live build noindex. Every build also runs Pagefind (`pagefind --site dist`) to create the site search index.

**Deploy with `--no-build`.** The Netlify CLI otherwise runs the `[build]` command from `netlify.toml` before uploading and replaces your `dist/`. That command is now `npm run build:preview`, because this Netlify site is the preview. After every build, run `npm run audit:seo -- preview` (or `-- live`). It checks robots, noindex, canonicals, titles, H1s, alt text, JSON-LD, OG images, internal links and the sitemap.

```bash
npm run build:preview && npm run audit:seo -- preview
npx netlify deploy --prod --no-build --dir dist --functions netlify/functions --site 80a154e1-ec6b-4c34-9fe9-b4050b3b6723
```

Production (automexa.co.uk) is a different site. Build live locally, then upload that `dist/` with `--no-build`. A deploy that runs the toml build command publishes the noindex preview by mistake.

```bash
npm run build:live && npm run audit:seo -- live
npx netlify deploy --prod --no-build --dir dist --functions netlify/functions --site 70b25969-b437-44e9-b9a2-ee5941d6c9f7
```

Social share image: one site-wide card, `public/og/automexa-og-v2.jpg` (1200x630, set in `Base.astro` as `OG_DEFAULT`). To change it, add a new filename (v3, ...) so social caches refresh. The old per-page cards (`npm run og`, `public/og/pages/`) are now only used as the case-study JSON-LD image.

## Currency (USD / GBP), added iter17

- Live since 8 Oct 2026 (production deploy `6ac81ae6176f1e41d7e18d22`; rollback `6ac8142a8a87c9251b3373ba`). GBP prices are shown excluding VAT: copy uses `{{gbp: + VAT}}`, a phrase rendered only in GBP mode.
- Prices are in one place: `PRICES` in `src/lib/currency.mjs`. Copy strings use tokens like `{{website}}`. Pages render both currencies, and `<html data-currency>` picks one.
- `netlify/edge-functions/currency.ts` sets `data-currency` on every HTML response. The saved choice (`amx_cur` cookie) wins, then country (GB, IM, JE, GG get GBP), then USD. The Netlify CLI uploads it automatically with `netlify deploy` (also with `--no-build`). Check the `x-amx-currency` response header after a deploy.
- The inline boot script also reads `amx_cur`, so a saved choice works without the edge function. Its CSP hash is in `netlify.toml`. If `src/scripts/motion/boot-inline.txt` changes, recompute the hash, or the script is blocked.

## Option A (recommended): host everything on Netlify, point DNS at it

The site and the lead function stay on one origin, so CORS and CSP need no changes.

1. Create a production Netlify site, or reuse `automexa-preview` and promote it. Never use the Mexy app site `cff66600-...`.
2. Set the server env vars from `.env.example` with production values:
   - `ALLOWED_ORIGINS=https://automexa.co.uk,https://www.automexa.co.uk`
   - `LEAD_NOTIFY_TO` is Barry's real inbox (`tahakh5510@gmail.com`), not info@ or hello@. Those addresses do not reach a person: inbound MX is another account's Amazon SES.
   - `LEAD_NOTIFY_FROM=Automexa <leads@automexa.co.uk>`. automexa.co.uk is verified on our Resend account (eu-west-1) as of 8 Oct 2026.
   - Optionally the `TURNSTILE_SECRET_KEY`.
3. Run `npm run build:live && npm run audit:seo -- live`, then `netlify deploy --prod --no-build --dir dist --functions netlify/functions --site <id>`. Netlify redirects HTTP to HTTPS automatically once the certificate is issued. `netlify.toml` adds the www-to-apex 301 and HSTS.
4. In Netlify, add the custom domains automexa.co.uk and www.automexa.co.uk.
5. In GoDaddy DNS (this needs the user's approval):
   - Point the apex A record to Netlify's load balancer, `75.2.60.5`.
   - Point `www` as a CNAME to `<site>.netlify.app`.
   - Or move the nameservers to Netlify DNS.
   - Keep the MX and TXT records exactly as they are, so email isn't interrupted.
6. After DNS resolves, check:
   - HTTPS works.
   - `robots.txt` allows crawling.
   - A test lead arrives, and is then deleted.
   - The 301s work (`/portfolio`, `/scorecard`, `/pay`, `/about-us`).

## Option B: keep GoDaddy hosting (static upload) and use the Netlify function for leads

1. Build with the function URL baked in:
   ```bash
   export PUBLIC_LEAD_ENDPOINT=https://<functions-site>.netlify.app/api/lead PUBLIC_NEWSLETTER_ENDPOINT=https://<functions-site>.netlify.app/api/newsletter
   npm run build:live
   ```
2. GoDaddy can't run the Netlify functions (`/api/lead`, `/api/newsletter`). Edit `public/.htaccess` before building. Add the function origin to `connect-src` in the Content-Security-Policy line, for example `connect-src 'self' https://<functions-site>.netlify.app ...`. Without this the browser blocks the form POST.
3. Add `https://automexa.co.uk,https://www.automexa.co.uk` to `ALLOWED_ORIGINS` on the Netlify functions site. The function rejects every other origin with 403.
4. Upload the **contents** of `dist/` to the GoDaddy web root (`public_html/`), including the hidden `.htaccess`. It contains:
   - the 301 redirects
   - the security headers
   - the cache rules
   - the custom 404
   - www-to-apex and HTTPS redirects
5. GoDaddy cPanel must have `mod_headers`, `mod_rewrite`, `mod_deflate` and `mod_mime` enabled. Most plans do. In cPanel:
   - Install the free AutoSSL or GoDaddy certificate for both automexa.co.uk and www.
   - Then confirm `http://www.automexa.co.uk/x` returns 301 → `https://automexa.co.uk/x` (`curl -I`).
   - Confirm the response carries `Strict-Transport-Security`.
   - Only add `preload` to HSTS after every subdomain is on HTTPS.

## Things to set before launch

| Variable | Where | What it's for |
|---|---|---|
| `PUBLIC_PLAUSIBLE_DOMAIN` **or** `PUBLIC_GA4_ID` | build | Analytics. Loads only after the visitor accepts analytics cookies. |
| `PUBLIC_BOOKING_URL` | build | Cal.com or Calendly link, shown next to the contact form |
| `PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | build + function | Bot protection on forms (optional; a honeypot, a timing check and a rate limit already run) |
| `RESEND_API_KEY` | function | Sending-only key for the automexa.co.uk domain, once it is verified |
| `LEAD_NOTIFY_TO` / `LEAD_NOTIFY_FROM` | function | Live site: `tahakh5510@gmail.com` and `Automexa <leads@automexa.co.uk>`. The preview site still uses Resend's test sink `delivered@resend.dev`. |
| `PUBLIC_GSC_VERIFICATION` / `PUBLIC_BING_VERIFICATION` | build | Search Console / Bing meta verification codes |
| `PUBLIC_NEWSLETTER_ENDPOINT` | build | Only for GoDaddy hosting (see Option B) |

## Search Console and Bing (after the live site is up)

1. Google Search Console:
   - Add a **Domain** property for `automexa.co.uk`. Verify it with the DNS TXT record GoDaddy shows (best).
   - Or add a **URL-prefix** property and use the HTML-tag method. Copy only the `content` value into `PUBLIC_GSC_VERIFICATION`, rebuild and deploy. The tag is then in every page's `<head>`.
2. Submit `https://automexa.co.uk/sitemap-index.xml` under Sitemaps.
3. Use URL Inspection on `/`, `/services/`, `/mexy/` and `/pricing/`, then select "Request indexing".
4. Bing Webmaster Tools:
   - Import from Search Console, or use `PUBLIC_BING_VERIFICATION` for the meta tag.
   - Submit the same sitemap.
5. After about a week, check Pages (indexing), Core Web Vitals and Enhancements (Breadcrumbs, FAQ) for errors.

## Database

- Leads go to `public.marketing_leads` in Supabase project `ctqghaphmqqiclaniwqm`. The migration is in `supabase/migrations/20261008_marketing_leads.sql` and is already applied.
- The function never holds a service-role key. It calls the `submit_marketing_lead` RPC with the publishable key plus a hashed ingest token.
- Row level security is on with no policies. Table access is revoked from anon and authenticated users.
- Newsletter sign-ups go to `public.marketing_newsletter` (migration `20261008b_marketing_newsletter.sql`, applied). It uses the same token-gated RPC model. Single opt-in with a recorded consent wording; double opt-in and unsubscribe links need the Resend domain.
- Read leads in the Supabase dashboard (Table editor → marketing_leads) or with SQL.
