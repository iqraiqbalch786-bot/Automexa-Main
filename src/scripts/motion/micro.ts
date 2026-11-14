/**
 * Micro-interactions shared by every page (all motion tiers; CSS does the animating):
 * - text roll on button labels (the label is duplicated visually with a text-shadow, so nothing is read twice),
 * - pointer-tracked light on cards ([data-tilt] also tilts in 3D on the "full" tier).
 */
import type { gsap as G } from "gsap";

export function initMicro(gsap: typeof G, tier: string) {
  document.querySelectorAll<HTMLElement>(".btn > span:first-of-type").forEach((s) => {
    if (s.querySelector(".roll") || s.children.length || !s.textContent?.trim()) return;
    const inner = document.createElement("span"); inner.className = "roll";
    inner.append(...[...s.childNodes]); s.append(inner); s.classList.add("roll-wrap");
  });
  if (tier !== "full") return;
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    const max = Number(el.dataset.tilt || 6);
    const rX = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" }), rY = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
    gsap.set(el, { transformPerspective: 1200 });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      rY((px - 0.5) * max * 2); rX(-(py - 0.5) * max * 2);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`); el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    });
    el.addEventListener("pointerleave", () => { rX(0); rY(0); });
  });
}
