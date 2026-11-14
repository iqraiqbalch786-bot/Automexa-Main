/** Text decode effect: letters resolve left to right from random glyphs. Visual only; the accessible name is fixed first. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%+";
export function scramble(el: HTMLElement, dur = 650) {
  const text = el.dataset.text || el.textContent || "";
  el.dataset.text = text;
  if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", text.trim());
  // lock width to avoid reflow while glyphs change
  const w = el.getBoundingClientRect().width; el.style.display = "inline-block"; el.style.minWidth = `${w}px`;
  const t0 = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    const solved = Math.floor(p * text.length);
    let out = "";
    for (let i = 0; i < text.length; i++) out += i < solved || text[i] === " " ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick); else { el.textContent = text; el.style.minWidth = ""; }
  };
  requestAnimationFrame(tick);
}
