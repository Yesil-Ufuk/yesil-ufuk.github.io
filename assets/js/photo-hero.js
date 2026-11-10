/* =========================================================
   Hero — photograph with a living sea (lightweight WebGL).
   The photo itself stays untouched where it is land or sky;
   only the sea is animated by refracting the photo's own
   water through moving wave slopes (perspective-correct, so
   ripples shrink towards the horizon), plus glints on the sun
   path, pointer ripples, twinkling stars and a breathing sun
   glow. A baked mask (R = sea, G = open sky) keeps rocks and
   trees perfectly still. The <img> underneath is the static
   version (no WebGL, reduced motion, while loading).
   ========================================================= */
(function () {
  "use strict";
  const canvas = document.querySelector("[data-photo-sea]");
  const img = document.querySelector(".hero__still img");
  if (!canvas || !img) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const IMG_ASPECT = 16 / 9;
  const HY = 0.5056;                 // horizon, image uv (from top)
  const SUN = [0.625, 0.505];        // sun centre, image uv
  const FOCUS = [0.62, 0.5];         // keep the sun in frame when cropping (matches CSS object-position)

  let gl;
  try { gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false }); }
  catch (e) { gl = null; }
  if (!gl) return;

  const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const FS = `
precision highp float;
uniform sampler2D uImg, uMask;
uniform vec2 uRes, uMouse, uFocus, uSun;
uniform float uTime, uStir, uImgAspect, uHY;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// screen uv (y from top) -> image uv, CSS object-fit: cover + object-position: focus
vec2 cover(vec2 s){
  float sa = uRes.x / uRes.y;
  vec2 frac = sa > uImgAspect ? vec2(1.0, uImgAspect / sa) : vec2(sa / uImgAspect, 1.0);
  return (1.0 - frac) * uFocus + s * frac;
}
vec2 slopes(vec2 w, float t, out float n){
  vec2 g = vec2(0.0);
  g += vec2(1.0, 0.35)  * cos(dot(w, vec2(1.0, 0.35))  * 5.0  + t * 1.05) * 0.50;
  g += vec2(-0.55, 1.0) * cos(dot(w, vec2(-0.55, 1.0)) * 8.5  + t * 1.45) * 0.36;
  g += vec2(0.25, 1.0)  * cos(dot(w, vec2(0.25, 1.0))  * 14.0 - t * 1.95) * 0.22;
  n = vnoise(w * vec2(2.6, 7.0) + vec2(t * 0.22, -t * 0.5));
  g += vec2(n - 0.5, (n - 0.5) * 1.6) * 0.65;
  return g;
}
void main(){
  vec2 s = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 iu = cover(s);
  vec4 m = texture2D(uMask, iu);
  vec3 col = texture2D(uImg, iu).rgb;
  float t = uTime;

  if (m.r > 0.01 && iu.y > uHY) {
    float dy = iu.y - uHY;
    float z = 0.09 / (dy + 0.003);
    vec2 w = vec2((iu.x - 0.5) * uImgAspect * z, z);
    float n;
    vec2 g = slopes(w, t, n);
    // pointer ripples, perspective-scaled
    vec2 mu = cover(uMouse);
    float mdy = mu.y - uHY;
    if (mdy > 0.0 && uStir > 0.002) {
      float mz = 0.09 / (mdy + 0.003);
      vec2 wp = vec2((mu.x - 0.5) * uImgAspect * mz, mz);
      vec2 dv = (w - wp) / max(mz, 0.2);
      float dd = length(dv);
      g += (dv / (dd + 1e-3)) * sin(dd * 34.0 - t * 7.0) * exp(-dd * 3.0) * uStir * 2.4;
    }
    float k = 0.0012 + 0.0085 * smoothstep(0.0, 0.5, dy);
    vec2 uv2 = iu + vec2(g.x * 0.55, g.y) * k;
    uv2.y = max(uv2.y, uHY + 0.0025);                       // never pull the sky into the sea
    float ok = texture2D(uMask, uv2).r;                      // never pull rocks into the sea
    vec3 sea = mix(col, texture2D(uImg, uv2).rgb, clamp(ok, 0.0, 1.0));
    // glints on wave crests along the sun path
    float crest = smoothstep(0.66, 1.0, clamp(g.y * 0.35 + 0.5 + (n - 0.5) * 0.5, 0.0, 1.0));
    float px = (iu.x - uSun.x) * uImgAspect / (0.045 + dy * 0.55);
    float path = exp(-px * px);
    sea += vec3(0.55, 1.0, 0.72) * crest * path * exp(-dy * 1.6) * 0.42;
    // subtle moving sheen so the open water never looks frozen
    sea *= 0.94 + 0.08 * clamp(g.y * 0.25 + 0.5, 0.0, 1.0);
    col = mix(col, sea, m.r);
  }

  // breathing sun glow (additive, only around the sun)
  vec2 sd = (iu - uSun) * vec2(uImgAspect, 1.0);
  float r = length(sd);
  col += vec3(0.30, 0.85, 0.55) * exp(-r * 9.0) * (0.035 + 0.025 * sin(t * 0.55)) * step(iu.y, uHY + 0.002);

  // twinkling stars in the open sky
  if (m.g > 0.01) {
    vec2 gp = vec2(iu.x * uImgAspect, iu.y) * 120.0;
    vec2 cell = floor(gp), f = fract(gp) - 0.5;
    float rnd = hash(cell);
    if (rnd > 0.9) {
      vec2 off = (vec2(hash(cell + 1.7), hash(cell + 5.3)) - 0.5) * 0.6;
      float st = 1.0 - smoothstep(0.0, 0.09 + 0.06 * hash(cell + 8.1), length(f - off));
      float tw = 0.5 + 0.5 * sin(t * (0.8 + rnd * 2.5) + rnd * 40.0);
      col += vec3(0.85, 1.0, 0.92) * st * tw * 0.55 * m.g;
    }
  }

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

  const sh = (type, src) => {
    const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; }
    return o;
  };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "a"); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const U = {};
  ["uImg", "uMask", "uRes", "uMouse", "uFocus", "uSun", "uTime", "uStir", "uImgAspect", "uHY"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit, image, linear) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });

  let W = 1, H = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(2, Math.round(r.width * d)); H = Math.max(2, Math.round(r.height * d));
    canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    gl.uniform2f(U.uRes, W, H);
    const portrait = r.height > r.width;
    gl.uniform2f(U.uFocus, portrait ? 0.62 : FOCUS[0], FOCUS[1]);
  };

  let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, stir = 0;
  const onPointer = (e, boost) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    stir = Math.min(1, stir + Math.hypot(x - tmx, y - tmy) * 6 + (boost || 0));
    tmx = x; tmy = y;
  };
  window.addEventListener("pointermove", (e) => onPointer(e, 0), { passive: true });
  window.addEventListener("pointerdown", (e) => onPointer(e, 0.5), { passive: true });

  let raf = 0, visible = true, last = 0, time = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - (last || now)) / 1000));
    last = now; time += dt;
    mx += (tmx - mx) * 0.12; my += (tmy - my) * 0.12;
    stir *= Math.exp(-dt * 1.3);
    gl.uniform1f(U.uTime, time);
    gl.uniform2f(U.uMouse, mx, my);
    gl.uniform1f(U.uStir, stir);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const start = () => { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(frame); };

  const photo = img.complete && img.naturalWidth ? Promise.resolve(img.currentSrc || img.src) : new Promise((r) => img.addEventListener("load", () => r(img.currentSrc || img.src), { once: true }));
  photo.then((src) => Promise.all([load(src), load("assets/img/hero-mask.png")])).then(([ph, mk]) => {
    texture(0, ph, true); texture(1, mk, true);
    gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uMask, 1);
    gl.uniform1f(U.uImgAspect, IMG_ASPECT); gl.uniform1f(U.uHY, HY);
    gl.uniform2f(U.uSun, SUN[0], SUN[1]);
    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); }, { passive: true });
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.classList.remove("is-live"); }, false);
    start();
    requestAnimationFrame(() => canvas.classList.add("is-live"));
  }).catch(() => { /* keep the static photo */ });
})();
