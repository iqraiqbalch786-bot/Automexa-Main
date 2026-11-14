/**
 * Site chrome behaviour: copy-to-clipboard, confirmation modal, back-to-top + progress fallback,
 * contact sheet focus, Pagefind search, and image skeletons. One small module, event delegation throughout.
 */
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Live region for short announcements (copy feedback etc.) */
let live: HTMLElement | null = null;
export function announce(msg: string) {
  if (!live) { live = document.createElement("p"); live.className = "sr-only"; live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite"); document.body.append(live); }
  live.textContent = ""; requestAnimationFrame(() => { live!.textContent = msg; });
}

/* Copy to clipboard ------------------------------------------------------- */
async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0";
    document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; } ta.remove(); return ok;
  }
}
function initCopy() {
  document.addEventListener("click", async (e) => {
    const b = (e.target as Element).closest?.<HTMLButtonElement>("[data-copy]");
    if (!b) return;
    const ok = await copyText(b.dataset.copy || "");
    const label = b.dataset.copyLabel || "text";
    b.classList.toggle("copied", ok);
    announce(ok ? `${label[0].toUpperCase()}${label.slice(1)} copied: ${b.dataset.copy}` : `Couldn't copy. The ${label} is ${b.dataset.copy}`);
    window.amxTrack?.("copy_click", { label });
    setTimeout(() => b.classList.remove("copied"), 1800);
  });
}

/* Confirmation modal for destructive actions ------------------------------ */
export function confirmAction(o: { title: string; body: string; confirm: string }): Promise<boolean> {
  const d = document.querySelector<HTMLDialogElement>("[data-confirm]");
  if (!d || typeof d.showModal !== "function") return Promise.resolve(window.confirm(`${o.title}\n\n${o.body}`));
  d.querySelector("[data-confirm-title]")!.textContent = o.title;
  d.querySelector("[data-confirm-body]")!.textContent = o.body;
  d.querySelector("[data-confirm-ok]")!.textContent = o.confirm;
  d.returnValue = "";
  const opener = document.activeElement as HTMLElement | null;
  d.showModal();
  return new Promise((res) => d.addEventListener("close", () => { opener?.focus?.(); res(d.returnValue === "ok"); }, { once: true }));
}
declare global { interface Window { amxConfirm: typeof confirmAction } }
window.amxConfirm = confirmAction;

/* Back to top + progress fallback ----------------------------------------- */
function initScroll() {
  const btn = document.querySelector<HTMLButtonElement>("[data-to-top]");
  if (btn && "IntersectionObserver" in window) {
    const s = document.createElement("div");
    s.setAttribute("aria-hidden", "true");
    s.style.cssText = "position:absolute;top:0;left:0;width:1px;height:110vh;pointer-events:none";
    document.body.prepend(s);
    new IntersectionObserver(([e]) => btn.classList.toggle("show", !e.isIntersecting)).observe(s);
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduce() ? "auto" : "smooth" });
      document.querySelector<HTMLElement>(".site-header a")?.focus({ preventScroll: true });
    });
  }
  const bar = document.querySelector<HTMLElement>("[data-sprog]");
  const cssDriven = CSS.supports?.("animation-timeline: scroll()") && !reduce();
  if (bar && !cssDriven) {
    let raf = 0;
    const set = () => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(set); }, { passive: true });
    addEventListener("resize", set, { passive: true }); set();
  }
}

/* Contact sheet: move focus in on open, restore on close ------------------- */
function initContactSheet() {
  const sheet = document.querySelector<HTMLElement>("[data-csheet]");
  if (!sheet) return;
  let opener: HTMLElement | null = null;
  document.addEventListener("click", (e) => { const t = (e.target as Element).closest?.<HTMLElement>("[popovertarget='contact-sheet']"); if (t && !t.closest("[data-csheet]")) opener = t; }, { capture: true });
  sheet.addEventListener("toggle", (e) => {
    const open = (e as ToggleEvent).newState === "open";
    if (open) { sheet.querySelector<HTMLElement>("a")?.focus(); window.amxTrack?.("contact_sheet_open"); }
    else opener?.focus?.();
  });
}

/* Search (Pagefind) -------------------------------------------------------- */
type PFResult = { url: string; excerpt: string; meta: { title?: string } };
type PF = { init?: () => Promise<void>; debouncedSearch: (q: string, o?: object, ms?: number) => Promise<{ results: { data: () => Promise<PFResult> }[] } | null> };
function initSearch() {
  const d = document.querySelector<HTMLDialogElement>("[data-search]");
  if (!d) return;
  const input = d.querySelector<HTMLInputElement>("[data-search-input]")!;
  const list = d.querySelector<HTMLElement>("[data-search-results]")!;
  const status = d.querySelector<HTMLElement>("[data-search-status]")!;
  let pf: Promise<PF> | null = null;
  let opener: HTMLElement | null = null;
  const load = () => (pf ||= import(/* @vite-ignore */ `${location.origin}/pagefind/pagefind.js`).then(async (m: PF) => { await m.init?.(); return m; }));
  const open = (q = "") => {
    opener = document.activeElement as HTMLElement;
    if (!d.open) d.showModal();
    input.value = q || input.value; input.focus(); input.select();
    load().catch(() => { status.textContent = "Search isn't available right now. Try the menu, or email info@automexa.co.uk."; });
    if (input.value) run();
  };
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  let seq = 0;
  const run = async () => {
    const q = input.value.trim(); const my = ++seq;
    if (q.length < 2) { list.innerHTML = ""; status.textContent = "Type at least 2 letters."; return; }
    status.textContent = "Searching…";
    try {
      const m = await load(); const r = await m.debouncedSearch(q, {}, 180);
      if (r === null || my !== seq) return;
      const data = await Promise.all(r.results.slice(0, 8).map((x) => x.data()));
      if (my !== seq) return;
      list.innerHTML = data.map((x) => {
        const url = x.url.replace(/index\.html$/, "");
        return `<li><a href="${esc(url)}"><span class="sr-t">${esc(x.meta.title || url)}</span><span class="sr-u">${esc(url)}</span><span class="sr-x">${x.excerpt}</span></a></li>`;
      }).join("");
      status.textContent = data.length ? `${r.results.length} result${r.results.length === 1 ? "" : "s"} for “${q}”` : `No results for “${q}”. Try “pricing”, “SEO” or “Mexy”.`;
      window.amxTrack?.("site_search", { q: q.slice(0, 40), n: r.results.length });
    } catch { status.textContent = "Search isn't available right now. Try the menu, or email info@automexa.co.uk."; }
  };
  input.addEventListener("input", run);
  d.querySelector("[data-search-form]")!.addEventListener("submit", (e) => { e.preventDefault(); list.querySelector<HTMLElement>("a")?.focus(); });
  d.querySelector("[data-search-close]")!.addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.addEventListener("close", () => opener?.focus?.());
  // One Esc closes, even when the search box has text (Chrome's first Esc would only clear it)
  d.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); d.close(); } });
  // Arrow keys move through results
  d.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [input, ...list.querySelectorAll<HTMLElement>("a")]; const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return; e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
  });
  document.addEventListener("click", (e) => { const t = (e.target as Element).closest?.("[data-search-open]"); if (t) { e.preventDefault(); open(); } });
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    const typing = t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); open(); }
  });
  const q = new URLSearchParams(location.search).get("search");
  if (q) open(q);
}

/* Image skeletons: shimmer only until the image has loaded ---------------- */
function initSkeletons() {
  document.querySelectorAll<HTMLElement>("[data-skeleton]").forEach((box) => {
    const img = box.querySelector("img");
    const done = () => box.classList.add("is-loaded");
    if (!img || (img.complete && img.naturalWidth)) return done();
    img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true });
  });
}

export function initChrome() { initCopy(); initScroll(); initContactSheet(); initSearch(); initSkeletons(); }
