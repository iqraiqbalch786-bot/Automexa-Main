/** Opt-in frame meter for real-device checks: add ?fps=1 to any URL. Shows frames per second, the worst frame
 *  in the last second, and the WebGL render scale. Not loaded otherwise. */
export function fpsMeter() {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;left:8px;top:8px;z-index:2147483647;font:600 12px/1.3 ui-monospace,monospace;color:#0a0a09;background:#e8be63;padding:6px 9px;border-radius:8px;pointer-events:none;box-shadow:0 4px 16px rgb(0 0 0/.4)";
  document.body.append(el);
  let n = 0, worst = 0, last = performance.now(), t0 = last;
  const tick = (now: number) => {
    const dt = now - last; last = now; n++; if (dt > worst) worst = dt;
    if (now - t0 >= 1000) {
      const fps = Math.round((n * 1000) / (now - t0));
      const g = (window as any).__heroGL?.frameStats?.();
      el.textContent = `${fps} fps · worst ${Math.round(worst)} ms` + (g ? ` · GL ${g.scale.toFixed(2)}x` : " · GL off");
      el.style.background = fps >= 55 ? "#e8be63" : fps >= 40 ? "#f0a35e" : "#ff6b6b";
      n = 0; worst = 0; t0 = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
