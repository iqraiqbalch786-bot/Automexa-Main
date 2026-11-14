/**
 * Home WebGL scene. Lazy: started after load + idle by the motion entry, never before LCP.
 * The canvas lives in a fixed full-viewport stage behind the page, so the gold body can travel with the
 * reader: solid liquid gold in the hero, a faint gold wireframe beside later sections, solid again at the
 * final call to action (see hero-mount.ts for the choreography). The hero poster stays as the LCP element
 * and static fallback. Pauses in background tabs and when fully faded out; adaptive render scale.
 */
import { getGL, program, fullscreenTriangle, governor } from "./glkit";
import { VERT, FRAG } from "./hero-shader";

export type Scene = { x: number; y: number; r: number; wire: number; alpha: number; yaw?: number; ex?: number; track?: boolean };
export type HeroGL = {
  destroy(): void; setScroll(v: number): void; setPage(v: number): void; setPaused(p: boolean): void; setScene(s: Scene): void;
  frameStats(): { frames: number; avgMs: number; scale: number }; defaultScene(): Scene;
};

export function startHeroGL(host: HTMLElement, opts: { mexy?: boolean; scale?: number; mobile?: boolean } = {}): HeroGL | null {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-gl"; canvas.setAttribute("aria-hidden", "true");
  const gl = getGL(canvas);
  if (!gl) return null;
  let prog: ReturnType<typeof program>;
  try { prog = program(gl, VERT, FRAG); } catch (e) { console.warn("hero shader", e); return null; }
  gl.useProgram(prog.p); fullscreenTriangle(gl);
  gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
  host.append(canvas);

  const mobile = opts.mobile ?? matchMedia("(max-width: 1023px), (max-aspect-ratio: 9/10)").matches;
  const gov = opts.scale ? governor(opts.scale, opts.scale, opts.scale) : governor(0.35, mobile ? 0.7 : 0.85, mobile ? 0.5 : 0.65);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const resize = () => {
    const r = host.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.max(2, Math.round(W * dpr * gov.scale)); canvas.height = Math.max(2, Math.round(H * dpr * gov.scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(host);

  // default framing: desktop = right of the headline; mobile = above it
  const defaultScene = (): Scene => {
    const aspect = W / Math.max(H, 1);
    if (mobile || aspect < 0.9) return { x: 0.0, y: 0.285, r: 0.22, wire: 0, alpha: 1, yaw: -0.7, ex: 0 };
    return { x: Math.min(0.6, aspect * 0.5 - 0.3), y: 0.0, r: 0.36, wire: 0, alpha: 1, yaw: -0.7, ex: 0 };
  };
  let target: Scene | null = null;
  const cur = { yaw: -0.5, ex: 0, ...defaultScene() } as Required<Scene>;
  let page = 0, sPage = 0;

  const gold = opts.mexy ? [0.24, 1.0, 0.45] : [1.0, 0.77, 0.33];
  const m = { x: 0.35, y: 0.1, tx: 0.35, ty: 0.1, hover: 0, th: 0 };
  let click = { x: 0, y: 0, t: 99 }, scroll = 0, sScroll = 0;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    m.tx = ((e.clientX - r.left) / r.width) * 2 - 1; m.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    m.th = 1;
  };
  const onLeave = () => { m.th = 0; };
  const onDown = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    click = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1), t: 0 };
  };
  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  addEventListener("pointerdown", onDown, { passive: true });

  let paused = false, raf = 0, last = performance.now(), frames = 0, sumMs = 0, clock = 0, cleared = false;
  const onVis = () => { if (!paused && !document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  document.addEventListener("visibilitychange", onVis);

  const loop = (now: number) => {
    raf = 0;
    if (document.hidden) return;
    const dt = Math.min(64, now - last); last = now;
    const k = 1 - Math.pow(0.0015, dt / 1000);           // frame-rate independent smoothing
    const tg = target || defaultScene();
    const ks = Math.min(1, k * 1.6);
    // tracking a section on screen (mobile interludes): follow it exactly so the mark scrolls with its section
    if (tg.track) { cur.x = tg.x; cur.y = tg.y; cur.r = tg.r; }
    else { cur.x += (tg.x - cur.x) * ks; cur.y += (tg.y - cur.y) * ks; cur.r += (tg.r - cur.r) * ks; }
    cur.wire += (tg.wire - cur.wire) * ks; cur.alpha += (tg.alpha - cur.alpha) * ks;
    cur.yaw += ((tg.yaw ?? cur.yaw) - cur.yaw) * ks * 0.8; cur.ex += ((tg.ex ?? 0) - cur.ex) * ks * 0.8;
    sPage += (page - sPage) * Math.min(1, k * 1.2);
    m.x += (m.tx - m.x) * k * 1.4; m.y += (m.ty - m.y) * k * 1.4; m.hover += (m.th - m.hover) * k;
    sScroll += (scroll - sScroll) * Math.min(1, k * 2.2);
    click.t += dt / 1000; if (!paused) clock += dt / 1000;
    if (cur.alpha < 0.004 && tg.alpha < 0.004) {
      // fully faded: clear once and idle cheaply until the choreography brings it back
      if (!cleared) { gl.clear(gl.COLOR_BUFFER_BIT); cleared = true; }
      if (!paused) raf = requestAnimationFrame(loop);
      return;
    }
    cleared = false;
    frames++; sumMs += dt;
    if (gov.sample(dt)) resize();
    gl.uniform2f(prog.u("uRes"), canvas.width, canvas.height);
    gl.uniform1f(prog.u("uTime"), clock + 2.0);
    gl.uniform2f(prog.u("uMouse"), m.x, m.y);
    gl.uniform1f(prog.u("uHover"), Math.max(m.hover, 0.18));
    gl.uniform1f(prog.u("uScroll"), sScroll);
    gl.uniform3f(prog.u("uClick"), click.x, click.y, click.t);
    gl.uniform3f(prog.u("uLayout"), cur.x, cur.y, cur.r);
    gl.uniform3f(prog.u("uGold"), gold[0], gold[1], gold[2]);
    gl.uniform1f(prog.u("uWire"), cur.wire);
    gl.uniform1f(prog.u("uAlpha"), cur.alpha);
    // node travels the frame once over the page, resting at the apex in the hero and back at the apex by the footer
    gl.uniform3f(prog.u("uPose"), cur.yaw, cur.ex, sPage);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!paused) raf = requestAnimationFrame(loop);
  };
  requestAnimationFrame((n) => { last = n; loop(n); canvas.classList.add("is-on"); document.documentElement.classList.add("gl-on"); });

  const once = () => { if (!raf) raf = requestAnimationFrame((n) => { last = n; loop(n); }); };
  return {
    setScroll(v) { scroll = Math.max(0, Math.min(1, v)); if (paused) once(); },
    setScene(s) { target = s; if (paused) once(); },
    setPage(v) { page = Math.max(0, Math.min(1, v)); if (paused) once(); },
    defaultScene,
    setPaused(p) { paused = p; if (!p && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } },
    frameStats() { return { frames, avgMs: frames ? sumMs / frames : 0, scale: gov.scale }; },
    destroy() {
      cancelAnimationFrame(raf); raf = 0; ro.disconnect();
      removeEventListener("pointermove", onMove); removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave); document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); document.documentElement.classList.remove("gl-on");
    },
  };
}
