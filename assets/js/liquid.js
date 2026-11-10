/* =========================================================
   Sun-over-water scene (lightweight WebGL), used twice:
   - hero  ([data-horizon]): half-sun on the horizon, sets
     as you scroll, pointer stirs the water;
   - about ([data-scene="dir"]): the sun is driven from
     main.js (dawn / zenith / dusk) via canvas._scene.
   Sky + sun are one analytic function; the water reflects
   that same function through a wave-distorted mirror, so
   the sun gets a real shimmering reflection path.
   Falls back to horizon.js (2D canvas) on the hero when
   WebGL is unavailable.
   ========================================================= */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;     // pointer, uv 0..1 (y up)
uniform float uStir;     // 0..1 pointer energy
uniform vec2 uSun;       // sun centre (uv)
uniform float uR;        // sun radius (uv height units)
uniform float uHY;       // horizon height (uv, from bottom)
uniform float uDay;      // 0 night .. 1 noon

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 stars(vec2 uv, float aspect){
  vec3 s = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    float sc = 34.0 + fl * 40.0;
    vec2 gp = vec2(uv.x * aspect, uv.y) * sc + vec2(fl * 31.7, fl * 17.3) + (uMouse - 0.5) * (1.6 + fl * 1.4);
    vec2 cell = floor(gp), f = fract(gp) - 0.5;
    float rnd = hash(cell + fl * 11.3);
    if (rnd > 0.80) {
      vec2 off = (vec2(hash(cell + 1.7), hash(cell + 5.3)) - 0.5) * 0.6;
      vec2 q = f - off;
      float size = 0.07 + 0.11 * hash(cell + 8.1);
      float tw = 0.45 + 0.55 * sin(uTime * (0.7 + rnd * 2.6) + rnd * 40.0);
      vec3 tint = mix(vec3(0.86, 0.95, 1.0), vec3(0.62, 1.0, 0.80), hash(cell + 2.2));
      float lum = smoothstep(size, 0.0, length(q)) * tw * (1.0 - fl * 0.28);
      if (rnd > 0.975) {
        float fx = smoothstep(0.035, 0.0, abs(q.y)) * smoothstep(0.5, 0.0, abs(q.x));
        float fy = smoothstep(0.035, 0.0, abs(q.x)) * smoothstep(0.5, 0.0, abs(q.y));
        lum += (fx + fy) * 0.45 * tw + exp(-length(q) * 9.0) * 0.25;
      }
      s += tint * lum;
    }
  }
  return s;
}

float meteor(vec2 uv, float aspect){
  float per = 6.5;
  float id = floor(uTime / per);
  float ph = fract(uTime / per) / 0.13;
  if (ph > 1.0) return 0.0;
  vec2 st = vec2(0.15 + 0.7 * hash(vec2(id, 1.3)), 0.80 + 0.15 * hash(vec2(id, 7.7)));
  vec2 dir = normalize(vec2(-0.85 + 1.7 * step(0.5, hash(vec2(id, 4.1))), -0.42));
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 a = vec2(st.x * aspect, st.y) + dir * ph * 0.42;
  vec2 b = a - dir * 0.16;
  vec2 pa = p - b, ba = a - b;
  float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return smoothstep(0.0028, 0.0, length(pa - ba * k)) * k * k * sin(ph * 3.14159);
}

vec3 sky(vec2 uv, float aspect, bool detail){
  float h = uv.y - uHY;
  float hn = clamp(h / max(1.0 - uHY, 0.05), 0.0, 1.0);
  vec3 night = mix(vec3(0.016, 0.040, 0.031), vec3(0.003, 0.005, 0.005), clamp(hn * 1.4, 0.0, 1.0));
  vec3 day   = mix(vec3(0.13, 0.33, 0.23), vec3(0.025, 0.085, 0.065), pow(hn, 0.7));
  vec3 c = mix(night, day, uDay);
  vec2 d = (uv - uSun) * vec2(aspect, 1.0);
  float r = length(d);
  float k = 0.17 / uR;   // keep the glow proportional to the sun
  // bloom
  c += vec3(0.16, 0.46, 0.30) * exp(-r * 3.4 * k) * (0.55 + uDay * 0.25);
  c += vec3(0.32, 0.80, 0.52) * exp(-r * 11.0 * k) * 0.55;
  // horizon haze, brightest under the sun
  c += vec3(0.20, 0.52, 0.35) * exp(-abs(h) * 46.0) * (0.25 + 0.55 * exp(-abs(d.x) * 1.6)) * (0.7 + 0.3 * (1.0 - uDay));
  if (detail && h > 0.0) {
    vec2 nq = vec2(uv.x * aspect * 1.4 + uv.y * 0.9, uv.y * 2.2 - uv.x * 0.6) * 2.0;
    float neb = vnoise(nq + vec2(uTime * 0.012, 0.0));
    c += vec3(0.05, 0.16, 0.12) * neb * neb * smoothstep(0.05, 0.4, h) * 0.6 * (1.0 - uDay);
    float glare = clamp(exp(-r * 2.2 * k) * 1.5, 0.0, 1.0);
    float vis = smoothstep(0.0, 0.22, h) * (1.0 - glare) * clamp(1.15 - uDay * 1.25, 0.0, 1.2);
    c += stars(uv, aspect) * vis;
    c += vec3(0.75, 1.0, 0.86) * meteor(uv, aspect) * (1.0 - glare * 0.8) * (1.0 - uDay);
  }
  // soft volumetric god rays
  if (detail && r < uR + 0.9) {
    float ang = atan(d.y, d.x) + uTime * 0.018;
    vec2 dir = vec2(cos(ang), sin(ang));
    float ray = vnoise(dir * 4.2 + vec2(uTime * 0.035, -uTime * 0.02));
    ray = smoothstep(0.42, 0.95, ray);
    float beam = ray * exp(-max(r - uR, 0.0) * 2.6 * k) * smoothstep(uR * 0.95, uR * 1.35, r) * smoothstep(uR + 0.9, uR + 0.55, r);
    c += vec3(0.22, 0.62, 0.40) * beam * (0.42 + 0.08 * sin(uTime * 0.7)) * (0.8 + uDay * 0.4);
  }
  // light motes drifting up through the glow
  if (detail && h > 0.0 && r < 0.6) {
    for (int l = 0; l < 1; l++) {
      float fl = float(l);
      float sc = 26.0 + fl * 18.0;
      vec2 gp = vec2(uv.x * aspect, uv.y) * sc + vec2(fl * 13.7, -uTime * (0.35 + fl * 0.25));
      vec2 cell = floor(gp), f = fract(gp) - 0.5;
      float rnd = hash(cell + fl * 7.1);
      vec2 off = vec2(hash(cell + 3.3), hash(cell + 9.1)) - 0.5;
      float m = smoothstep(0.08, 0.0, length(f - off * 0.6));
      float tw = 0.5 + 0.5 * sin(uTime * (1.5 + rnd * 2.0) + rnd * 6.28);
      c += vec3(0.62, 1.0, 0.78) * m * step(0.72, rnd) * tw * exp(-r * 3.0) * (0.55 - fl * 0.2);
    }
  }
  // the sun itself: an emissive orb — saturated mint body, white-hot core,
  // bright limb that melts into a soft corona (no hard line, no rings)
  float aa = 1.6 / uRes.y;                                  // ~1.5 px antialiased edge
  float disc = smoothstep(uR + aa, uR - aa, r) * step(0.0, h);
  float q = clamp(r / uR, 0.0, 1.0);
  float lat = clamp((uv.y - uSun.y) / uR, 0.0, 1.0);
  vec3 body = mix(vec3(0.30, 0.80, 0.50), vec3(0.56, 0.98, 0.72), lat * 0.6);
  body = mix(body, vec3(0.90, 1.00, 0.93), pow(1.0 - q, 2.4) * 0.6);    // hot centre
  body += vec3(0.30, 0.85, 0.52) * smoothstep(0.72, 1.0, q) * 0.45;      // glowing limb
  c = mix(c, body, disc);
  float od = max(r - uR, 0.0);
  c += vec3(0.45, 1.00, 0.66) * (exp(-od * 26.0 * k) * 0.42 + exp(-od * 7.0 * k) * 0.14) * step(0.0, h);
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  vec3 col;
  if (uv.y >= uHY) {
    col = sky(uv, aspect, true);
  } else {
    float dy = uHY - uv.y;
    float z = 0.09 / (dy + 0.0025);
    vec2 w = vec2((uv.x - 0.5) * aspect * z, z);

    // wave slopes (derivatives of travelling sines) + one noise layer
    vec2 g = vec2(0.0);
    g += vec2(1.0, 0.35) * cos(dot(w, vec2(1.0, 0.35)) * 5.0 + t * 1.10) * 0.55;
    g += vec2(-0.55, 1.0) * cos(dot(w, vec2(-0.55, 1.0)) * 8.5 + t * 1.55) * 0.38;
    g += vec2(0.25, 1.0) * cos(dot(w, vec2(0.25, 1.0)) * 14.0 - t * 2.05) * 0.22;
    float n = vnoise(w * vec2(2.6, 7.0) + vec2(t * 0.25, -t * 0.55));
    g += vec2(n - 0.5, (n - 0.5) * 1.6) * 0.7;

    // pointer ripples
    float pdy = uHY - uMouse.y;
    if (pdy > 0.0 && uStir > 0.002) {
      float pz = 0.09 / (pdy + 0.0025);
      vec2 wp = vec2((uMouse.x - 0.5) * aspect * pz, pz);
      vec2 dv = (w - wp) / max(pz, 0.2);
      float dd = length(dv);
      g += (dv / (dd + 1e-3)) * sin(dd * 34.0 - t * 7.0) * exp(-dd * 3.2) * uStir * 2.2;
    }

    // mirror the sky through the waves, broken into streaks
    float k = 0.006 + 0.03 * smoothstep(0.0, 0.5, dy);
    vec2 ruv = vec2(uv.x + g.x * k * 1.5, uHY + dy * 1.35 + g.y * k);
    vec3 refl = sky(ruv, aspect, false);
    float streak = smoothstep(0.2, 0.9, sin(w.y * 10.0 + g.y * 2.4 + n * 3.0 - t * 0.9) * 0.5 + 0.5);
    refl *= mix(1.0, 0.25 + 0.95 * streak, smoothstep(0.0, 0.05, dy));

    float fres = mix(0.85, 0.22, smoothstep(0.0, 0.5, dy));
    vec3 deep = mix(vec3(0.004, 0.012, 0.010), vec3(0.012, 0.040, 0.030), uDay);
    deep += vec3(0.0, 0.025, 0.018) * (g.y * 0.5 + 0.5) * (0.4 + uDay * 0.6);
    col = mix(deep, refl, fres);

    // glitter on wave crests along the sun path
    float crest = smoothstep(0.62, 1.0, g.y * 0.35 + 0.5 + (n - 0.5) * 0.5);
    float path = exp(-pow((uv.x - uSun.x) * aspect / (0.10 + dy * 0.75), 2.0));
    float lit = clamp((uSun.y - uHY) / uR + 0.85, 0.0, 1.0);
    col += vec3(0.62, 1.0, 0.76) * crest * path * exp(-dy * 2.2) * 0.75 * lit;

    col *= mix(1.0, 0.5, smoothstep(0.08, 0.56, dy));
  }

  vec2 v = (uv - vec2(0.5, 0.55)) * vec2(aspect * 0.7, 1.0);
  col *= 1.0 - smoothstep(0.55, 1.35, length(v)) * 0.65;
  col = col / (1.0 + col * 0.2);
  gl_FragColor = vec4(col, 1.0);
}`;

  function mount(cv, opt) {
    let gl = null;
    try { gl = cv.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" }); }
    catch (e) { gl = null; }
    if (!gl) return null;

    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const U = {};
    ["uRes", "uTime", "uMouse", "uStir", "uSun", "uR", "uHY", "uDay"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let scale = coarse ? 0.5 : 0.6, W = 2, H = 2;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 1.25);
      W = Math.max(2, Math.round(r.width * d * scale)); H = Math.max(2, Math.round(r.height * d * scale));
      cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); gl.uniform2f(U.uRes, W, H);
    };

    let px = 0.6, py = 0.4, mx = 0.6, my = 0.4, stir = 0;
    const onPointer = (e, boost) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      if (y < -0.1 || y > 1.1 || x < -0.1 || x > 1.1) return;
      stir = Math.min(1, stir + Math.hypot(x - px, y - py) * 6 + (boost || 0));
      px = x; py = y;
    };
    window.addEventListener("pointermove", (e) => onPointer(e, 0), { passive: true });
    window.addEventListener("pointerdown", (e) => onPointer(e, 0.6), { passive: true });

    let raf = 0, visible = true, last = performance.now(), time = 8, frames = 0, slow = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now; time += dt;
      frames++; if (dt > 0.034) slow++;
      if (frames === 90) { if (slow > 45 && scale > 0.5) { scale = Math.max(0.48, scale * 0.85); resize(); } frames = 0; slow = 0; }
      mx += (px - mx) * 0.08; my += (py - my) * 0.08;
      stir *= Math.exp(-dt * 1.4);
      const s = opt.state(W / H, mx);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, mx, my);
      gl.uniform1f(U.uStir, stir);
      gl.uniform2f(U.uSun, s.x, s.y);
      gl.uniform1f(U.uR, s.r);
      gl.uniform1f(U.uHY, s.hy);
      gl.uniform1f(U.uDay, s.day);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };

    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduce) frame(performance.now()); }, 120); }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible && !reduce) start(); }).observe(cv);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !reduce) start(); });
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); }, false);
    if (reduce) frame(performance.now()); else start();
    return { redraw: () => frame(performance.now()) };
  }

  /* ---------------- hero ---------------- */
  const hero = document.querySelector("[data-horizon]");
  if (hero) {
    let setK = 0, setS = 0;
    window.addEventListener("scroll", () => { setK = Math.min(1, window.scrollY / Math.max(1, hero.getBoundingClientRect().height)); }, { passive: true });
    const HY = 0.56;
    const ok = mount(hero, {
      state: (aspect, mx) => {
        setS += (setK - setS) * 0.12;
        const r = 0.17 * Math.min(1, Math.max(0.62, aspect / 1.6));
        const sx = 0.5 + 0.12 * Math.min(1, Math.max(0, (aspect - 1) / 0.8));
        return { x: sx + (mx - 0.5) * 0.035, y: HY - setS * r * 0.85, r, hy: HY, day: 0.12 * (1 - setS) };
      }
    });
    if (ok) hero.dataset.gl = "on";
  }

  /* ---------------- about: dawn / zenith / dusk ---------------- */
  const dirCv = document.querySelector('[data-scene="dir"]');
  if (dirCv) {
    const S = { p: 0.0 };   // 0 dawn .. 0.5 noon .. 1 dusk — animated by main.js
    const HY = 0.34;
    const api = mount(dirCv, {
      state: (aspect) => {
        const r = 0.085 * Math.min(1.25, Math.max(0.8, aspect / 2.6));
        const e = Math.sin(Math.max(0, Math.min(1, S.p)) * Math.PI);   // elevation 0..1
        return {
          x: 0.18 + 0.64 * S.p,
          y: HY - r * 0.55 + e * (0.86 - HY),
          r, hy: HY,
          day: Math.pow(e, 1.3) * 0.95
        };
      }
    });
    dirCv._scene = { state: S, redraw: api ? api.redraw : () => {} };
    if (!api) dirCv.closest(".dir__stage").classList.add("no-gl");
  }
})();
