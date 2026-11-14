/** Tiny WebGL1 helpers (own code): context, program, fullscreen triangle, textures. */
export type GLCtx = WebGLRenderingContext;

export function getGL(canvas: HTMLCanvasElement, opts: WebGLContextAttributes = {}): GLCtx | null {
  const force = /[?&]gl=force\b/.test(location.search);
  const attrs: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", failIfMajorPerformanceCaveat: !force, ...opts };
  const gl = (canvas.getContext("webgl", attrs) as GLCtx | null) || (canvas.getContext("experimental-webgl", attrs) as GLCtx | null);
  if (!gl || force) return gl;
  // CPU-rendered WebGL (SwiftShader, llvmpipe, Microsoft Basic Render) would cost the main thread
  // far more than it gives, so those devices get the static poster instead.
  if (isSoftware(gl)) { gl.getExtension("WEBGL_lose_context")?.loseContext(); return null; }
  return gl;
}

let soft: boolean | undefined;
export function isSoftware(gl: GLCtx) {
  if (soft !== undefined) return soft;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
  return (soft = /swiftshader|llvmpipe|softpipe|software|basic render/.test(r));
}

export function program(gl: GLCtx, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  const cache: Record<string, WebGLUniformLocation | null> = {};
  const u = (n: string) => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)));
  return { p, u };
}

export function fullscreenTriangle(gl: GLCtx) {
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

export function texture(gl: GLCtx, img: TexImageSource) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  return t;
}

/** Frame-time governor: lowers the render scale when frames run long, raises it when there's headroom. */
export function governor(min: number, max: number, start: number) {
  let scale = start, acc = 0, n = 0;
  return {
    get scale() { return scale; },
    sample(dtMs: number) {
      acc += dtMs; n++;
      if (n < 40) return false;
      const avg = acc / n; acc = 0; n = 0;
      const prev = scale;
      if (avg > 21) scale = Math.max(min, scale * 0.8);
      else if (avg < 13 && scale < max) scale = Math.min(max, scale * 1.1);
      return Math.abs(prev - scale) > 0.01;
    },
  };
}
