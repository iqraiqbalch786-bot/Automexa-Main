/** Lenis smooth scroll (desktop "full" tier only), driven by GSAP's ticker and synced with ScrollTrigger. */
import Lenis from "lenis";
import type { gsap as G } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";

declare global { interface Window { lenis?: Lenis } }

export function initSmooth(gsap: typeof G, ScrollTrigger: typeof ST) {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95, anchors: { offset: -80 }, prevent: (n) => !!(n as Element).closest?.("dialog, [popover], .mobile-menu, [data-lenis-prevent]") });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.lenis = lenis;
  // Freeze the page behind modals, the mobile menu and the cookie banner focus trap.
  const html = document.documentElement;
  const sync = () => {
    const lock = html.classList.contains("menu-open") || !!document.querySelector("dialog[open]");
    if (lock) lenis.stop(); else lenis.start();
  };
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ["class"] });
  document.querySelectorAll("dialog").forEach((d) => new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ["open"] }));
  return lenis;
}
