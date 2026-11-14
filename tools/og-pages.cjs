// Renders one 1200x630 Open Graph card per built page into public/og/pages/<slug>.jpg (and dist/og/pages/).
// Usage (after a build): node tools/og-pages.cjs   — needs Playwright + Chrome (see automexa-v2-tools).
const NM = '/workspace/atrium-preview-build/node_modules/';
const { chromium } = require(NM + '@playwright/test');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const DIST = path.join(ROOT, 'dist'); const PUB = path.join(ROOT, 'public');
const b64 = (f) => fs.readFileSync(path.join(PUB, 'fonts', f)).toString('base64');
const fav = fs.readFileSync(path.join(PUB, 'favicon.svg'), 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['_astro', 'pagefind', 'og'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name === 'index.html' ? [path.join(d, e.name)] : []);
const txt = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
(async () => {
  const pages = walk(DIST).map((f) => {
    const html = fs.readFileSync(f, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/.test(html) && !process.env.OG_ALLOW_NOINDEX) {/* preview builds are noindex site-wide; still render */}
    const rel = path.relative(DIST, path.dirname(f)).split(path.sep).join('/');
    const slug = rel ? rel.replace(/\//g, '-') : 'home';
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1];
    const pre = html.slice(0, html.search(/<h1[^>]*>/));
    const ms = [...pre.matchAll(/<p class="marker[^"]*"[^>]*>([\s\S]*?)<\/p>/g)];
    const marker = ms.length ? ms[ms.length - 1][1] : (rel ? '' : 'Growth partner');
    return { slug, path: '/' + (rel ? rel + '/' : ''), h1: txt(h1), marker: txt(marker), mexy: /(^|-)mexy$/.test(slug) };
  }).filter((p) => p.h1);
  const out = path.join(PUB, 'og', 'pages'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const p of pages) {
    const acc = p.mexy ? '#3dff74' : '#d4af37';
    const len = p.h1.length; const fs1 = len > 60 ? 92 : len > 40 ? 108 : 128;
    await pg.setContent(`<html><head><style>
      @font-face{font-family:D;src:url(data:font/woff2;base64,${b64('league-gothic.woff2')})}
      @font-face{font-family:G;src:url(data:font/woff2;base64,${b64('geist.woff2')})}
      @font-face{font-family:M;src:url(data:font/woff2;base64,${b64('geist-mono.woff2')})}
      body{margin:0;width:1200px;height:630px;box-sizing:border-box;padding:64px 76px;background:#0a0a09;color:#f5f2ea;font-family:G;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
      body:before{content:"";position:absolute;inset:auto -200px -340px auto;width:760px;height:760px;border-radius:50%;background:radial-gradient(closest-side,${acc}33,transparent)}
      body:after{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:${acc}}
      .top{display:flex;align-items:center;justify-content:space-between}
      .brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:650;letter-spacing:-.02em}.brand svg{width:50px;height:50px}
      .mk{font-family:M;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:${acc}}
      h1{font-family:D;font-weight:400;text-transform:uppercase;font-size:${fs1}px;line-height:.9;letter-spacing:.005em;margin:0;max-width:1000px}
      .bot{display:flex;justify-content:space-between;font-family:M;font-size:22px;color:#a39d90}
    </style></head><body><div class="top"><div class="brand">${fav}Automexa</div><div class="mk">${esc(p.marker || '')}</div></div>
      <h1>${esc(p.h1)}</h1><div class="bot"><span>automexa.co.uk${esc(p.path === '/' ? '' : p.path)}</span><span>Websites · SEO · Ads · AI</span></div></body></html>`);
    await pg.evaluate(() => document.fonts.ready);
    const file = path.join(out, p.slug + '.jpg');
    await pg.screenshot({ path: file, type: 'jpeg', quality: 82 });
    const d = path.join(DIST, 'og', 'pages'); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(file, path.join(d, p.slug + '.jpg'));
    console.log(p.slug, fs.statSync(file).size);
  }
  // Default card (used by noindex pages such as the 404)
  await pg.setContent(`<html><head><style>@font-face{font-family:D;src:url(data:font/woff2;base64,${b64('league-gothic.woff2')})}@font-face{font-family:G;src:url(data:font/woff2;base64,${b64('geist.woff2')})}
    body{margin:0;width:1200px;height:630px;box-sizing:border-box;padding:64px 76px;background:#0a0a09;color:#f5f2ea;font-family:G;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;border-top:6px solid #d4af37}
    .brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:650}.brand svg{width:50px;height:50px}h1{font-family:D;font-weight:400;text-transform:uppercase;font-size:128px;line-height:.9;margin:0}h1 span{color:#d4af37}p{font-size:26px;color:#a39d90;margin:0}
    </style></head><body><div class="brand">${fav}Automexa</div><h1>Your growth partner for<br><span>websites, SEO and AI.</span></h1><p>automexa.co.uk</p></body></html>`);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(PUB, 'og', 'default.png') }); fs.copyFileSync(path.join(PUB, 'og', 'default.png'), path.join(DIST, 'og', 'default.png'));
  await b.close();
})();
