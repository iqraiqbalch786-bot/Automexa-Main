/**
 * Split-text reveals (own code, no library): headings marked [data-split] are split into masked words,
 * grouped into lines, and slide up line by line when they enter the viewport.
 * - Screen readers get the original text: the heading keeps an aria-label; the word spans are aria-hidden.
 * - Inline styling (e.g. the gold italic .acc word) is preserved by cloning the wrapper per word.
 * - Re-splits on width change so line grouping stays correct. Off under html:not(.motion).
 */
const SEL = "[data-split], main .h2:not([data-nosplit]), main .page-hero h1";
const done = new WeakMap<HTMLElement, string>();

function splitEl(el: HTMLElement) {
  if (!done.has(el)) done.set(el, el.innerHTML);
  else el.innerHTML = done.get(el)!;
  const label = el.textContent!.replace(/\s+/g, " ").trim();
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
  const words: HTMLElement[] = [];
  const walk = (node: Node, wrap: (inner: HTMLElement) => Node) => {
    const kids = [...node.childNodes];
    for (const k of kids) {
      if (k.nodeType === 3) {
        const parts = k.textContent!.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) { frag.append(document.createTextNode(" ")); continue; }
          const mask = document.createElement("span"); mask.className = "sw"; mask.setAttribute("aria-hidden", "true");
          const inner = document.createElement("span"); inner.className = "swi"; inner.textContent = p;
          mask.append(wrap(inner)); frag.append(mask); words.push(mask);
        }
        k.replaceWith(frag);
      } else if (k.nodeType === 1 && (k as Element).tagName !== "BR") {
        const elK = k as HTMLElement;
        const shell = () => { const c = elK.cloneNode(false) as HTMLElement; c.removeAttribute("id"); return c; };
        const frag = document.createDocumentFragment();
        const tmp = document.createElement("span"); tmp.append(...[...elK.childNodes]);
        walk(tmp, (inner) => { const s = shell(); s.append(wrap(inner)); return s; });
        frag.append(...[...tmp.childNodes]);
        elK.replaceWith(frag);
      }
    }
  };
  walk(el, (inner) => inner);
  return words;
}

/** Line grouping reads layout once for all headings (no read/write interleaving), then writes. */
function group(batch: [HTMLElement, HTMLElement[]][]) {
  const tops = batch.map(([, words]) => words.map((w) => w.offsetTop));
  batch.forEach(([el, words], i) => {
    let line = -1, lastTop = -Infinity;
    words.forEach((w, k) => { const top = tops[i][k]; if (top > lastTop + 4) { line++; lastTop = top; } w.style.setProperty("--l", String(line)); });
    el.style.setProperty("--lines", String(line + 1));
    el.classList.add("is-split");
  });
}
const splitAll = (els: HTMLElement[]) => group(els.map((e) => [e, splitEl(e)] as [HTMLElement, HTMLElement[]]));

export function initSplit(root: ParentNode = document) {
  // headings that contain links or controls are left whole (splitting would duplicate the link per word)
  const els = [...root.querySelectorAll<HTMLElement>(SEL)].filter((e) => !e.querySelector("a, button, input, svg"));
  root.querySelectorAll<HTMLElement>(SEL).forEach((e) => { if (!els.includes(e)) { e.setAttribute("data-split", ""); e.classList.add("is-split", "is-in"); } });
  if (!els.length) return;
  const html = document.documentElement;
  if (!html.classList.contains("motion")) { els.forEach((e) => e.classList.add("is-in")); return; }
  const introEnd = html.classList.contains("intro") ? 1500 : 0;
  const run = () => {
    splitAll(els);
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target as HTMLElement; io.unobserve(el);
      const wait = el.closest("[data-hero]") ? Math.max(0, introEnd - performance.now()) : 0;
      el.style.setProperty("--wait", `${Math.round(wait)}ms`);
      requestAnimationFrame(() => el.classList.add("is-in"));
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    els.forEach((e) => io.observe(e));
  };
  (document.fonts?.ready ?? Promise.resolve()).then(run);
  // keep line grouping right when the width changes
  let w = innerWidth, t = 0;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - w) < 40) return; w = innerWidth;
    clearTimeout(t); t = window.setTimeout(() => { const was = els.map((e) => e.classList.contains("is-in")); splitAll(els); els.forEach((e, i) => was[i] && e.classList.add("is-in")); }, 200);
  });
}
