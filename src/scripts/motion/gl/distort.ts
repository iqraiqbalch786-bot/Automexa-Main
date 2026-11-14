/**
 * Hover distortion for showcase screens (own shader). One small WebGL canvas per screen, created on first hover.
 * The canvas redraws the screen's image with a liquid ripple around the pointer, an RGB split that follows
 * pointer speed, and a slight lens zoom. The image's own pan (object position) is passed as a uv offset,
 * so the canvas lines up with the DOM image underneath. Fades out on leave and stops rendering.
 */
import { getGL, program, fullscreenTriangle, texture } from "./glkit";

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D uTex;
uniform vec2 uMouse;     // 0..1 in canvas space
uniform vec2 uVel;       // pointer velocity
uniform float uHover;    // 0..1
uniform float uTime;
uniform vec4 uCrop;      // x,y offset and w,h scale of the visible window inside the texture
uniform float uAspect;   // canvas w/h
void main(){
  vec2 uv=v;
  vec2 d=uv-uMouse; d.x*=uAspect;
  float dist=length(d);
  float ring=sin(dist*38.0-uTime*7.0)*exp(-dist*7.0);
  vec2 dir=dist>0.0001?d/dist:vec2(0.0);
  dir.x/=uAspect;
  float lens=smoothstep(0.32,0.0,dist)*0.035;
  uv-=dir*(ring*0.012+lens)*uHover;
  uv=(uv-0.5)*(1.0-0.03*uHover)+0.5;
  vec2 tuv=uCrop.xy+uv*uCrop.zw;
  vec2 sh=uVel*0.004*uCrop.zw*uHover*smoothstep(0.42,0.0,dist);   // split measured on screen, not across the whole (tall) texture
  float r=texture2D(uTex,tuv+sh).r;
  vec4 g=texture2D(uTex,tuv);
  float b=texture2D(uTex,tuv-sh).b;
  vec3 col=vec3(r,g.g,b);
  col+=vec3(1.0,0.85,0.45)*smoothstep(0.25,0.0,dist)*0.06*uHover;
  gl_FragColor=vec4(col,1.0)*uHover;
}`;

type Crop = () => [number, number, number, number];

export function attachDistort(host: HTMLElement, img: HTMLImageElement | HTMLVideoElement, crop: Crop) {
  const isVideo = img instanceof HTMLVideoElement;
  let canvas: HTMLCanvasElement | null = null, gl: WebGLRenderingContext | null = null, prog: ReturnType<typeof program> | null = null;
  let raf = 0, hover = 0, target = 0, t0 = 0, last = 0;
  const m = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0 };
  let failed = false;

  const setup = () => {
    if (canvas || failed) return !!canvas;
    if (isVideo ? (img as HTMLVideoElement).readyState < 2 : !(img as HTMLImageElement).complete || !(img as HTMLImageElement).naturalWidth) return false;
    canvas = document.createElement("canvas"); canvas.className = "dist-gl"; canvas.setAttribute("aria-hidden", "true");
    gl = getGL(canvas, { alpha: true });
    if (!gl) { failed = true; canvas = null; return false; }
    try { prog = program(gl, VERT, FRAG); } catch (e) { failed = true; canvas = null; return false; }
    gl.useProgram(prog.p); fullscreenTriangle(gl);
    // upload a downscaled copy (keeps GPU memory small for very tall screenshots)
    if (isVideo) texture(gl, img); // small (868 px) loop: uploaded directly and refreshed every frame
    else {
      const im = img as HTMLImageElement;
      const maxH = 4096, s = Math.min(1, maxH / im.naturalHeight, 1600 / im.naturalWidth);
      const c2 = document.createElement("canvas"); c2.width = Math.round(im.naturalWidth * s); c2.height = Math.round(im.naturalHeight * s);
      c2.getContext("2d")!.drawImage(im, 0, 0, c2.width, c2.height);
      texture(gl, c2);
    }
    host.append(canvas); size(); t0 = performance.now();
    new ResizeObserver(size).observe(host);
    return true;
  };
  const size = () => {
    if (!canvas || !gl) return;
    const r = { width: host.clientWidth, height: host.clientHeight }, dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const frame = (now: number) => {
    raf = 0; if (!gl || !prog || !canvas) return;
    const dt = Math.min(48, now - (last || now)); last = now;
    const k = 1 - Math.pow(0.001, dt / 1000);
    hover += (target - hover) * k * 1.2;
    m.x += (m.tx - m.x) * k * 1.6; m.y += (m.ty - m.y) * k * 1.6;
    m.vx *= 0.9; m.vy *= 0.9;
    const c = crop();
    gl.uniform2f(prog.u("uMouse"), m.x, m.y);
    gl.uniform2f(prog.u("uVel"), Math.max(-1.5, Math.min(1.5, m.vx)), Math.max(-1.5, Math.min(1.5, m.vy)));
    gl.uniform1f(prog.u("uHover"), hover);
    gl.uniform1f(prog.u("uTime"), (now - t0) / 1000);
    gl.uniform4f(prog.u("uCrop"), c[0], c[1], c[2], c[3]);
    gl.uniform1f(prog.u("uAspect"), canvas.width / canvas.height);
    if (isVideo) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.style.opacity = hover > 0.02 ? "1" : "0";
    if (target > 0 || hover > 0.01) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  host.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse") return; if (!setup()) return; target = 1; kick(); });
  host.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !canvas) return;
    const r = host.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
    m.vx = (nx - m.tx) * 60; m.vy = (ny - m.ty) * 60; m.tx = nx; m.ty = ny; kick();
  });
  host.addEventListener("pointerleave", () => { target = 0; kick(); });
}
