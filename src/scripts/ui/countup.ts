/*
 * CountUp, vanilla port adapted from React Bits "CountUp"
 * https://reactbits.dev/text-animations/count-up · MIT + Commons Clause · © 2026 David Haz
 * Changes: no React/motion dependency. Like the original it is spring-driven, here a
 * critically damped spring (damping ratio 1.0, response ~0.35 s: no overshoot) that
 * always starts from the value currently on screen and keeps its velocity when the
 * target changes mid-flight, so dragging a slider feels continuous and interruptible.
 * Instant under prefers-reduced-motion. See CREDITS.md.
 */
const rm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
type S = { x: number; v: number; target: number; raf: number; last: number; format: (n: number) => string };
const state = new WeakMap<Element, S>();
const RESPONSE = 0.35; // seconds (Apple-style "response"); damping ratio = 1
const W = (2 * Math.PI) / RESPONSE; // natural frequency

export function countTo(el: Element, to: number, format: (n: number) => string) {
  let s = state.get(el);
  if (!s) { s = { x: to, v: 0, target: to, raf: 0, last: 0, format }; state.set(el, s); }
  s.target = to; s.format = format;
  if (rm() || !Number.isFinite(s.x)) { cancelAnimationFrame(s.raf); s.raf = 0; s.x = to; s.v = 0; el.textContent = format(to); return; }
  if (s.raf) return; // already animating: the running spring re-targets from its current value and velocity
  const st = s;
  st.last = performance.now();
  const step = (now: number) => {
    let dt = Math.min(0.1, (now - st.last) / 1000); st.last = now;
    // semi-implicit Euler on x'' = -W^2 (x - target) - 2W x'  (critically damped), in fixed 4 ms substeps:
    // a single large step (slow or throttled frames) would make the damping term overshoot and diverge
    while (dt > 0) {
      const h = Math.min(0.004, dt); dt -= h;
      const a = -W * W * (st.x - st.target) - 2 * W * st.v;
      st.v += a * h; st.x += st.v * h;
    }
    const settled = Math.abs(st.x - st.target) < Math.max(0.5, Math.abs(st.target) * 0.0005) && Math.abs(st.v) < 1;
    if (settled) { st.x = st.target; st.v = 0; st.raf = 0; el.textContent = st.format(st.target); return; }
    el.textContent = st.format(st.x);
    st.raf = requestAnimationFrame(step);
  };
  st.raf = requestAnimationFrame(step);
}

/** Seed the starting value without animating (e.g. the server-rendered value). */
export function seed(el: Element, value: number) { state.set(el, { x: value, v: 0, target: value, raf: 0, last: 0, format: String }); }
