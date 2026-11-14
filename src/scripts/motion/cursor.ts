/**
 * Custom cursor (desktop, fine pointer, "full" tier): a gold dot plus a lagging ring that
 * - grows over anything interactive,
 * - morphs into a labelled disc over [data-cursor="Label"] (e.g. "View case", "Call", "Drag"),
 * - hides over text fields (the native I-beam returns there),
 * - presses on mousedown.
 * Magnetic pull: buttons and [data-magnetic] drift toward the pointer (CSS `translate`, so they keep their own transforms).
 * Decorative only: aria-hidden, never replaces focus styles; the native cursor is hidden only while this runs.
 */
import type { gsap as G } from "gsap";

export function initCursor(gsap: typeof G) {
  const html = document.documentElement;
  const root = document.createElement("div");
  root.className = "cur"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<div class="cur-ring"><span class="cur-label"></span></div><div class="cur-dot"></div>';
  document.body.append(root);
  const ring = root.firstElementChild as HTMLElement, dot = root.lastElementChild as HTMLElement, label = ring.firstElementChild as HTMLElement;
  const rx = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3" });
  const dx = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2" }), dy = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2" });
  let shown = false;
  const INTERACTIVE = "a, button, [role=button], summary, label, select, .chip, [data-cursor]";
  const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, [contenteditable]";

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!shown) { shown = true; html.classList.add("has-cursor"); gsap.set([ring, dot], { x: e.clientX, y: e.clientY }); }
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
  }, { passive: true });
  document.addEventListener("pointerleave", () => root.classList.add("is-out"));
  document.addEventListener("pointerenter", () => root.classList.remove("is-out"));
  addEventListener("pointerdown", () => root.classList.add("is-down"), { passive: true });
  addEventListener("pointerup", () => root.classList.remove("is-down"), { passive: true });

  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    const lab = t.closest<HTMLElement>("[data-cursor]");
    const text = t.closest(TEXT);
    root.classList.toggle("is-text", !!text);
    root.classList.toggle("is-link", !lab && !!t.closest(INTERACTIVE));
    root.classList.toggle("is-label", !!lab);
    root.classList.toggle("is-mexy", !!t.closest(".mexy-scope"));
    if (lab) label.textContent = lab.dataset.cursor || "";
  });

  // Magnetic elements
  const mags = document.querySelectorAll<HTMLElement>(".btn, .icon-btn, .cdock, [data-magnetic]");
  mags.forEach((el) => {
    const strength = Number(el.dataset.magnetic || 0.28);
    let r: DOMRect | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      r ||= el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength, y = (e.clientY - (r.top + r.height / 2)) * strength * 1.2;
      gsap.to(el, { "--magx": `${x.toFixed(1)}px`, "--magy": `${y.toFixed(1)}px`, duration: 0.35, ease: "power3", overwrite: "auto" });
    };
    el.addEventListener("pointerenter", () => { r = el.getBoundingClientRect(); el.classList.add("is-mag"); });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", () => { r = null; gsap.to(el, { "--magx": "0px", "--magy": "0px", duration: 0.7, ease: "elastic.out(1, 0.45)", onComplete: () => el.classList.remove("is-mag") }); });
  });
}
