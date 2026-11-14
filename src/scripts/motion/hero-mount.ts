/**
 * Starts the home WebGL scene in a fixed stage behind the page and choreographs it by scroll:
 * each section marked [data-gl="preset"] is an anchor; between anchors the scene interpolates
 * position, size, solid-to-wireframe and presence. Also wires the hero pause toggle.
 */
import { startHeroGL, type Scene } from "./gl/hero";

type Preset = (a: number, mobile: boolean) => Scene;
const off = { wire: 1, alpha: 0 } as const;
const P: Record<string, Preset> = {
  // hero: 3/4 view of the mark beside the headline (desktop) or above it (mobile)
  hero: (a, mob) => (mob ? { x: 0.0, y: 0.285, r: 0.22, wire: 0, alpha: 1, yaw: -0.7, ex: 0 } : { x: Math.min(0.6, a * 0.5 - 0.3), y: 0.0, r: 0.36, wire: 0, alpha: 1, yaw: -0.7, ex: 0 }),
  hide: (a, mob) => (mob ? { x: a * 0.5, y: 0.2, r: 0.3, ...off } : { x: a * 0.5 - 0.3, y: 0.1, r: 0.3, ...off }),
  // desktop: a gold scan-line contour in the empty column beside a section; mobile keeps text clear (the mark gets its own interludes)
  right: (a, mob) => (mob ? { x: a * 0.5, y: 0.12, r: 0.3, ...off, yaw: 0.9 } : { x: a * 0.5 - 0.24, y: 0.12, r: 0.24, wire: 1, alpha: 0.5, yaw: 0.9, ex: 0.15 }),
  // pricing: the mark steps out so the plans read cleanly, turning while hidden
  left: (a, mob) => (mob ? { x: -a * 0.5, y: 0.08, r: 0.3, ...off, yaw: -1.3 } : { x: a * 0.5 - 0.3, y: 0.0, r: 0.26, ...off, yaw: -1.3, ex: 0.3 }),
  // FAQ: kept clear of the questions on every screen size; the mark turns while hidden so the CTA can reveal it face-on
  faq: (a, mob) => (mob ? { x: -a * 0.5, y: 0.0, r: 0.3, ...off, yaw: 2.2 } : { x: a * 0.5 - 0.42, y: 0.0, r: 0.3, ...off, yaw: 2.2 }),
  // the "how it works" steps: the mark as a solid exploded diagram under the step cards
  big: (a, mob) => (mob ? { x: 0, y: 0.0, r: 0.3, ...off, yaw: 1.5, ex: 1 } : { x: a * 0.5 - 0.27, y: -0.08, r: 0.28, wire: 0, alpha: 1, yaw: 1.5, ex: 1 }),
  // inner page hero: centred in the free column right of the hero text, sized to fit it, hidden if there is no room
  page: (a, mob) => ({ x: a * 0.5 - 0.3, y: 0.02, r: 0.3, wire: 0, alpha: mob ? 0 : 1, yaw: -0.6, ex: 0 }),
  soft: (a, mob) => (mob ? { x: a * 0.5 + 0.02, y: 0.25, r: 0.28, ...off } : { x: a * 0.5 - 0.22, y: 0.1, r: 0.22, wire: 1, alpha: 0.36, yaw: 1.1, ex: 0.2 }),
  // footer call to action: reassembled and turned face-on, like the logo
  cta: (a, mob) => (mob ? { x: 0, y: 0.3, r: 0.24, ...off, yaw: 0.0, ex: 0 } : { x: a * 0.5 - 0.42, y: 0.02, r: 0.3, wire: 0, alpha: 1, yaw: 0.0, ex: 0 }),
  // mobile-only interludes (hidden on desktop): the mark gets a full screen to itself between sections
  interlude: (a, mob) => ({ x: 0, y: 0.03, r: mob ? 0.27 : 0.3, wire: 0, alpha: 1, yaw: 2.3, ex: 0 }),
  finale: (a, mob) => ({ x: 0, y: 0.03, r: mob ? 0.26 : 0.3, wire: 0, alpha: 1, yaw: 0.0, ex: 0 }),
  explode: (a, mob) => ({ x: 0, y: 0.03, r: mob ? 0.2 : 0.3, wire: 0, alpha: 1, yaw: 1.5, ex: 1 }),
};
const ease = (t: number) => t * t * (3 - 2 * t);

// Desktop placement check: each visible preset is tested against the content on screen at its anchor. If the mark
// would cover text, media, controls or cards, it moves into the free column right of that content (shrinking down
// to a floor); if there is no such column it steps aside (the home hero dims to a faint contour instead).
type Fit = { x: number; r: number; ok: boolean };
const fits = new WeakMap<HTMLElement, Fit>();
// on-screen half-width and half-height of the mark with its tilted orbit ring, in viewport heights per unit of r
const RX = 0.9, RY = 1.35;
function contentBoxes(viewTop: number) {
  const boxes: { t: number; b: number; l: number; r: number }[] = [];
  const add = (r: DOMRect) => { if (r.width > 0 && r.height > 0) boxes.push({ t: r.top - viewTop, b: r.bottom - viewTop, l: r.left, r: r.right }); };
  const scope = document.querySelector("main") || document.body;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;
      const el = n as HTMLElement;
      if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("data-hero-gl")) return NodeFilter.FILTER_REJECT; // decoration
      const r = el.getBoundingClientRect();
      return r.bottom - viewTop < 0 || r.top - viewTop > innerHeight ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) { if (!n.textContent?.trim()) continue; range.selectNodeContents(n); for (const r of range.getClientRects()) add(r); continue; }
    const el = n as HTMLElement, tag = el.tagName.toUpperCase(), r = el.getBoundingClientRect();
    if (r.width > innerWidth * 0.7) continue; // full-bleed bands and backdrops are not content
    if (/^(IMG|VIDEO|FORM|INPUT|SELECT|TEXTAREA|SVG|IFRAME|BUTTON|CANVAS)$/.test(tag)) { add(r); continue; }
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== "none") add(r);
  }
  return boxes;
}
function fitAt(el: HTMLElement, name: string, s: Scene): Fit {
  const er = el.getBoundingClientRect();
  // where the viewport sits when this anchor is reached (same rule as the anchor positions); the page can't scroll above its top
  const viewTop = name === "hero" ? -scrollY : Math.max(-scrollY, er.top + Math.min(er.height, innerHeight) / 2 - innerHeight / 2);
  const boxes = contentBoxes(viewTop);
  const cy = innerHeight * (0.5 - s.y), gap = 56, edge = 32;
  const hits = (x: number, r: number) => {
    const cx = innerWidth / 2 + x * innerHeight, hw = RX * r * innerHeight, hh = RY * r * innerHeight;
    return boxes.some((b) => b.b > cy - hh && b.t < cy + hh && b.r > cx - hw && b.l < cx + hw);
  };
  if (!hits(s.x, s.r)) return { x: s.x, r: s.r, ok: true };
  for (let r = s.r; r >= 0.18; r -= 0.01) {
    const hh = RY * r * innerHeight, hw = RX * r * innerHeight;
    let right = 0; for (const b of boxes) if (b.b > cy - hh && b.t < cy + hh) right = Math.max(right, b.r);
    const free = innerWidth - edge - (right + gap);
    if (free >= 2 * hw) return { x: (right + gap + free / 2 - innerWidth / 2) / innerHeight, r, ok: true };
  }
  return { x: s.x, r: s.r, ok: false };
}

export function mountHero(posterHost: HTMLElement | null, ScrollTrigger: any, opts: { mexy?: boolean } = {}) {
  const stage = document.createElement("div");
  stage.className = "gl-stage"; stage.setAttribute("aria-hidden", "true");
  document.body.prepend(stage);
  const g = startHeroGL(stage, { mexy: opts.mexy });
  if (!g) { stage.remove(); document.documentElement.classList.add("no-gl"); return; }
  (window as any).__heroGL = g;
  document.documentElement.classList.add("gl-live"); // reveals the mobile interludes before the next ScrollTrigger refresh

  const toggle = document.querySelector<HTMLButtonElement>("[data-hero-gl-toggle]");
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const p = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", String(p)); g.setPaused(p);
    });
  }

  // anchors: centre of each [data-gl] section, in document coordinates
  let anchors: { y: number; name: string; el: HTMLElement }[] = [];
  const FIG = new Set(["interlude", "explode", "finale"]);
  let docH = 1;
  const measure = () => {
    docH = document.documentElement.scrollHeight;
    anchors = [...document.querySelectorAll<HTMLElement>("[data-gl]")].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = el.getBoundingClientRect();
      const name = el.dataset.gl || "hide";
      const pos = name === "hero" ? 0 : r.top + scrollY + Math.min(r.height, innerHeight) / 2 - innerHeight / 2;
      return { y: pos, name, el };
    }).sort((a, b) => a.y - b.y);
    // desktop: check each visible preset against the content on screen at its anchor
    const a = innerWidth / innerHeight;
    if (!(innerWidth < 1024 || a < 0.9)) for (const an of anchors) {
      const s = P[an.name]?.(a, false);
      if (s && s.alpha > 0.01) fits.set(an.el, fitAt(an.el, an.name, s)); else fits.delete(an.el);
    }
  };
  const update = () => {
    if (!anchors.length) return;
    const a = innerWidth / innerHeight, mob = innerWidth < 1024 || a < 0.9; // same test as the CSS that shows the interludes
    const y = scrollY;
    g.setPage(y / Math.max(1, docH - innerHeight));
    // phones: an interlude owns the mark only while it is on screen; the mark sits centred in it and scrolls with it,
    // fading in as the section arrives, so it never floats over the neighbouring content
    if (mob) {
      for (const an of anchors) {
        if (!FIG.has(an.name)) continue;
        const r = an.el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= innerHeight) continue;
        const s = P[an.name](a, mob);
        const vis = (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / Math.max(1, Math.min(r.height, innerHeight));
        g.setScene({ ...s, y: s.y + (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight, alpha: ease(Math.min(1, Math.max(0, (vis - 0.3) / 0.45))), track: true });
        return;
      }
    }
    let i = 0; while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    const t = B === A ? 0 : ease(Math.min(1, Math.max(0, (y - A.y) / Math.max(1, B.y - A.y))));
    const pre = (an: { name: string; el: HTMLElement }) => {
      const s = P[an.name]?.(a, mob) || P.hide(a, mob);
      if (mob) return FIG.has(an.name) ? { ...s, alpha: 0 } : s;
      const f = fits.get(an.el); if (!f || s.alpha < 0.01) return s;
      if (f.ok) return { ...s, x: f.x, r: f.r };
      return an.name === "hero" ? { ...s, wire: 1, alpha: 0.3 } : { ...s, alpha: 0 };
    };
    const sa = pre(A), sb = pre(B);
    // fade out on the way between two visible states only if one of them hides
    const ya = sa.yaw ?? sb.yaw ?? 0, yb = sb.yaw ?? ya;
    // appearing or disappearing: fade only in the half of the journey nearest the visible anchor, and keep the
    // visible state's material, so no half-faded ghost of the mark drifts behind the text in between
    let ta = t, wire = sa.wire + (sb.wire - sa.wire) * t;
    if (sa.alpha < 0.01 && sb.alpha > 0.01) { ta = Math.max(0, (t - 0.5) / 0.5); wire = sb.wire; }
    else if (sb.alpha < 0.01 && sa.alpha > 0.01) { ta = Math.min(1, t / 0.5); wire = sa.wire; }
    g.setScene({ x: sa.x + (sb.x - sa.x) * t, y: sa.y + (sb.y - sa.y) * t, r: sa.r + (sb.r - sa.r) * t, wire, alpha: sa.alpha + (sb.alpha - sa.alpha) * ta,
      yaw: ya + (yb - ya) * t, ex: (sa.ex ?? 0) + ((sb.ex ?? 0) - (sa.ex ?? 0)) * t });
  };
  measure(); update();
  ScrollTrigger.addEventListener("refresh", () => { measure(); update(); });
  addEventListener("scroll", update, { passive: true });
  const hero = posterHost?.closest("section") || document.querySelector("main .page-hero") || document.querySelector("main > section");
  if (hero) ScrollTrigger.create({ trigger: hero, start: "top top", end: "bottom top", onUpdate: (s: any) => g.setScroll(s.progress) });
  // first frame: start from the current anchor rather than gliding in from the default framing
  if (!posterHost) { stage.style.opacity = "0"; requestAnimationFrame(() => { stage.style.transition = "opacity 900ms ease"; stage.style.opacity = "1"; }); }
}
