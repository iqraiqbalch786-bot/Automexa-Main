/**
 * Motion entry. Split text runs straight away (it only adds classes); everything heavy loads after the
 * page's load event + idle so it never competes with LCP:
 *   GSAP + ScrollTrigger (pins, scrubs, parallax), Lenis (desktop only), custom cursor + magnetic (desktop only),
 *   micro-interactions, the hero WebGL scene, the work reel, the pinned manifesto and the footer marquee.
 * Static tier (reduced motion, Save-Data, slow or low-power devices): nothing loads; the CSS shows final states.
 */
import { initSplit } from "./split";
import { tier as getTier } from "./tier";

// Hand control back to the browser between setup steps so no single task blocks input for long.
const yieldToMain = () => new Promise<void>((r) => ("scheduler" in window && (window as any).scheduler.yield ? (window as any).scheduler.yield().then(r) : setTimeout(r, 0)));
const idle = (fn: () => void) => {
  const go = () => ("requestIdleCallback" in window ? (window as any).requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 120));
  if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
};

export function initMotion() {
  if (/[?&]fps=1\b/.test(location.search)) import("./fps").then((m) => m.fpsMeter());
  const t = getTier();
  initSplit();
  if (t === "static") return;
  idle(async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
    gsap.registerPlugin(ScrollTrigger);
    (window as any).__motion = { gsap, ScrollTrigger };
    ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded,load" });
    // WebGL stage: the home hero has its poster; inner pages get the solid mark in the free space beside their page
    // hero (green on Mexy pages), stay clear of the content sections and return at the footer call to action.
    // Phones skip it on inner pages: there is no free column beside the text, and it saves the GPU and battery.
    const heroHost = document.querySelector<HTMLElement>("[data-hero-gl]");
    const narrow = innerWidth < 761 || innerWidth / innerHeight < 0.9;
    const pageHero = heroHost || narrow ? null : document.querySelector<HTMLElement>("main .page-hero");
    if (pageHero) {
      pageHero.dataset.gl ||= "page";
      document.querySelectorAll<HTMLElement>("main > section:not(.page-hero), main > div > section").forEach((s) => { s.dataset.gl ||= "hide"; });
    }
    if (heroHost || pageHero) {
      const mexy = heroHost?.dataset.mexy === "true" || /^\/(mexy|work\/mexy)\//.test(location.pathname);
      (await import("./hero-mount")).mountHero(heroHost, ScrollTrigger, { mexy }); await yieldToMain();
    }
    if (t === "full") {
      const [{ initSmooth }, { initCursor }] = await Promise.all([import("./smooth"), import("./cursor")]);
      initSmooth(gsap, ScrollTrigger); await yieldToMain(); initCursor(gsap); await yieldToMain();
    }
    const { initMicro } = await import("./micro"); initMicro(gsap, t); await yieldToMain();
    // top-to-bottom creation order matters for pins (the reel pin pushes everything below it down)
    if (document.querySelector("[data-reel]")) { (await import("./reel")).initReel(gsap, ScrollTrigger, t); await yieldToMain(); }
    const { initScenes } = await import("./scenes"); initScenes(gsap, ScrollTrigger, t); await yieldToMain();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    // refresh on real resizes only (width change), debounced: mobile URL-bar height changes don't re-layout pins
    let w = innerWidth, rt = 0;
    addEventListener("resize", () => { if (Math.abs(innerWidth - w) < 2) return; w = innerWidth; clearTimeout(rt); rt = window.setTimeout(() => ScrollTrigger.refresh(), 250); });
    document.documentElement.classList.add("motion-ready");
  });
}
