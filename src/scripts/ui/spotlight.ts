/*
 * Spotlight cards — vanilla port adapted from React Bits "SpotlightCard"
 * https://reactbits.dev/components/spotlight-card · MIT + Commons Clause · © 2026 David Haz
 * Changes: one delegated pointermove listener for every [data-spotlight] element
 * (no per-card React component), fine pointers only, rAF-throttled, brand-green
 * colour via CSS token. Styles live in global.css (.spotlight). See CREDITS.md.
 */
export function initSpotlight() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let raf = 0; let last: PointerEvent | null = null;
  document.addEventListener("pointermove", (e) => {
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const t = (last!.target as Element | null)?.closest?.<HTMLElement>("[data-spotlight]");
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${last!.clientX - r.left}px`);
      t.style.setProperty("--my", `${last!.clientY - r.top}px`);
    });
  }, { passive: true });
}
