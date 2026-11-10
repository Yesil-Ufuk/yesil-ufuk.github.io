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
uniform float uSceneA;   // landscape on the horizon (0 sea, 1 Cappadocia, 2 Istanbul, 3 construction)
uniform float uSceneB;
uniform float uMix;      // 0 -> A, 1 -> B

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


// ---------- landscape silhouettes (signed distance, < 0 inside) ----------
// p.x = uv.x * aspect, p.y = height above the horizon (uv units), A = aspect
float sdBox(vec2 p, vec2 c, vec2 b){ vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdCirc(vec2 p, vec2 c, float r){ return length(p - c) - r; }
float hump(float f, float c, float w, float hgt){ float q = (f - c) / w; return hgt * max(0.0, 1.0 - q * q); }
float cone(vec2 p, float x, float y0, float w, float ht){
  float ty = p.y - y0;
  return max(abs(p.x - x) - w * (1.0 - clamp(ty / ht, 0.0, 1.0)), max(-ty, ty - ht));
}

float sceneSea(vec2 p, float A){
  float f = p.x / A;
  float h = hump(f, 0.07, 0.075, 0.020) + hump(f, 0.19, 0.05, 0.012) + hump(f, 0.88, 0.09, 0.026) + hump(f, 0.975, 0.05, 0.016);
  float d = p.y - h;
  float lx = 0.9 * A;                                    // a lighthouse on the island
  d = min(d, sdBox(p, vec2(lx, 0.040), vec2(0.0026, 0.016)));
  d = min(d, cone(p, lx, 0.056, 0.0042, 0.008));
  return d;
}
float sceneCap(vec2 p, float A){
  float f = p.x / A;
  float ridge = 0.022 + 0.012 * sin(f * 11.0 + 0.6) + 0.007 * sin(f * 29.0 + 2.0);
  ridge *= 1.0 - 0.75 * exp(-pow((f - 0.62) / 0.12, 2.0));
  float d = p.y - ridge;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float side = i < 7 ? 0.0 : 1.0;
    float k = mod(fi, 7.0);
    float cx = (side < 0.5 ? 0.02 + k * 0.05 : 0.74 + k * 0.042) * A + 0.012 * sin(fi * 4.1) * A;
    float hh = 0.035 + 0.06 * fract(sin(fi * 12.7) * 43.1);
    float w = 0.014 + 0.012 * fract(sin(fi * 7.3) * 91.7);
    d = min(d, cone(p, cx, 0.0, w, hh));
    d = min(d, max(sdCirc(p, vec2(cx, hh * 0.98), w * 0.75), hh * 0.9 - p.y));   // mushroom cap
  }
  return d;
}
// hot-air balloons: own lit layer (they glow, they are not black blobs)
vec4 balloons(vec2 p, float A, float amt){
  vec4 o = vec4(0.0);
  if (amt < 0.001) return o;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float fx = fract(0.04 + fi * 0.131 + uTime * 0.004 * (0.6 + fract(fi * 0.37)));
    float bx = fx * A + 0.01 * sin(uTime * 0.2 + fi * 2.0);
    float by = 0.12 + 0.24 * fract(sin(fi * 3.1) * 17.3) + 0.012 * sin(uTime * 0.25 + fi);
    float r = 0.011 + 0.012 * fract(sin(fi * 5.7) * 29.1);
    vec2 q = p - vec2(bx, by);
    float env = length(q / vec2(1.0, 1.12)) - r;                       // envelope
    env = min(env, cone(p, bx, by - r * 1.5, r * 0.55, r * 0.75));      // taper to the basket
    float basket = sdBox(p, vec2(bx, by - r * 1.72), vec2(r * 0.2, r * 0.16));
    float aa = 1.4 / uRes.y;
    float ce = smoothstep(aa, -aa, env), cb = smoothstep(aa, -aa, basket);
    // shading: lit from the burner below and the sun side, stripes along the envelope
    float shade = 0.55 + 0.45 * clamp(-q.y / r * 0.6 + 0.4, 0.0, 1.0);
    float stripe = 0.82 + 0.18 * step(0.5, fract(atan(q.x, -q.y) * 1.6 + 0.25));
    float flick = 0.85 + 0.15 * sin(uTime * 9.0 + fi * 3.0);
    vec3 hue = mix(vec3(0.95, 0.62, 0.32), vec3(0.55, 0.95, 0.68), step(0.5, fract(fi * 0.53)));
    vec3 col = hue * shade * stripe * (0.42 + 0.25 * flick);
    col += vec3(1.0, 0.75, 0.42) * exp(-length(q - vec2(0.0, -r * 0.9)) / r * 3.0) * 0.5 * flick;
    vec3 bc = vec3(0.06, 0.04, 0.03);
    float cov = max(ce, cb);
    vec3 c = mix(col, bc, cb);
    o.rgb = mix(o.rgb, c, cov * (1.0 - o.a * 0.0));
    o.a = max(o.a, cov);
  }
  o.a *= amt;
  return o;
}
float minaret(vec2 p, float x, float H, float w){
  float d = sdBox(p, vec2(x, H * 0.5), vec2(w, H * 0.5));
  d = min(d, sdBox(p, vec2(x, H * 0.78), vec2(w * 1.9, w * 0.55)));
  d = min(d, cone(p, x, H, w * 1.1, w * 9.0));
  return d;
}
float mosque(vec2 p, float x, float R){
  float d = sdBox(p, vec2(x, R * 0.35), vec2(R * 1.3, R * 0.35));
  d = min(d, max(sdCirc(p, vec2(x, R * 0.7), R), R * 0.7 - p.y));
  d = min(d, max(sdCirc(p, vec2(x - R * 0.95, R * 0.62), R * 0.52), R * 0.62 - p.y));
  d = min(d, max(sdCirc(p, vec2(x + R * 0.95, R * 0.62), R * 0.52), R * 0.62 - p.y));
  d = min(d, sdBox(p, vec2(x, R * 1.78), vec2(R * 0.04, R * 0.12)));
  d = min(d, minaret(p, x - R * 1.75, R * 3.1, R * 0.075));
  d = min(d, minaret(p, x + R * 1.75, R * 3.1, R * 0.075));
  d = min(d, minaret(p, x - R * 2.45, R * 2.6, R * 0.07));
  d = min(d, minaret(p, x + R * 2.45, R * 2.6, R * 0.07));
  return d;
}
float sceneIst(vec2 p, float A){
  float f = p.x / A;
  float cell = floor(f * 70.0);
  float bh = (0.008 + 0.012 * fract(sin(cell * 13.1) * 437.5)) * step(0.11, abs((cell + 0.5) / 70.0 - 0.62));
  float d = p.y - bh;
  d = min(d, mosque(p, 0.16 * A, 0.042));
  d = min(d, mosque(p, 0.38 * A, 0.030));
  d = min(d, mosque(p, 0.86 * A, 0.036));
  float gx = 0.955 * A;                                   // Galata tower
  d = min(d, sdBox(p, vec2(gx, 0.034), vec2(0.0085, 0.034)));
  d = min(d, sdBox(p, vec2(gx, 0.069), vec2(0.0105, 0.003)));
  d = min(d, cone(p, gx, 0.071, 0.0105, 0.032));
  return d;
}
float crane(vec2 p, float x, float H, float dir){
  float m = 0.0045;
  float d = sdBox(p, vec2(x, H * 0.5), vec2(m, H * 0.5));                         // mast
  float jl = 0.22, cl = 0.06;
  d = min(d, sdBox(p, vec2(x + dir * (jl - cl) * 0.5, H), vec2((jl + cl) * 0.5, 0.0045)));   // jib
  d = min(d, sdBox(p, vec2(x - dir * cl * 0.85, H - 0.011), vec2(0.013, 0.009)));            // counterweight
  d = min(d, sdBox(p, vec2(x + dir * 0.012, H - 0.016), vec2(0.009, 0.008)));               // cab
  d = min(d, cone(p, x, H, 0.006, 0.03));                                         // top
  // pendant lines from the apex to the jib tips
  vec2 ap = vec2(x, H + 0.03), tip = vec2(x + dir * jl, H), tail = vec2(x - dir * cl, H);
  vec2 pa = p - ap, ba = tip - ap; float h1 = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  d = min(d, length(pa - ba * h1) - 0.0012);
  ba = tail - ap; h1 = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  d = min(d, length(pa - ba * h1) - 0.0012);
  // trolley + hanging load, slowly travelling
  float hx = x + dir * (0.09 + 0.07 * sin(uTime * 0.18 + x));
  float hl = 0.06 + 0.025 * sin(uTime * 0.23 + x * 3.0);
  d = min(d, sdBox(p, vec2(hx, H - hl * 0.5), vec2(0.0011, hl * 0.5)));
  d = min(d, sdBox(p, vec2(hx, H - hl - 0.005), vec2(0.012, 0.005)));
  return d;
}
float sceneBuild(vec2 p, float A){
  float f = p.x / A;
  float cell = floor(f * 24.0);
  float r1 = fract(sin(cell * 91.3) * 437.5);
  float bh = (0.02 + 0.10 * r1) * step(0.12, abs((cell + 0.5) / 24.0 - 0.62));
  float d = p.y - bh;
  d = min(d, crane(p, 0.19 * A, 0.26, 1.0));
  d = min(d, crane(p, 0.87 * A, 0.22, -1.0));
  return d;
}
float sceneD(vec2 p, float s, float A){
  if (s < 0.5) return sceneSea(p, A);
  if (s < 1.5) return sceneCap(p, A);
  if (s < 2.5) return sceneIst(p, A);
  return sceneBuild(p, A);
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
  // landscape silhouettes in front of the sun: old one sinks, new one rises
  if (h > -0.003 && h < 0.48) {
    vec2 sp = vec2(uv.x * aspect, h);
    float aa2 = 1.4 / uRes.y;
    float cov = 0.0, rim = 0.0;
    if (uMix < 0.999) {
      float dA = sceneD(sp + vec2(0.0, uMix * 0.06), uSceneA, aspect);
      float cA = smoothstep(aa2, -aa2, dA) * (1.0 - uMix);
      cov = max(cov, cA); rim = max(rim, smoothstep(-0.006, 0.0, dA) * cA);
    }
    if (uMix > 0.001) {
      float dB = sceneD(sp - vec2(0.0, (1.0 - uMix) * 0.06), uSceneB, aspect);
      float cB = smoothstep(aa2, -aa2, dB) * uMix;
      cov = max(cov, cB); rim = max(rim, smoothstep(-0.006, 0.0, dB) * cB);
    }
    vec3 sil = mix(vec3(0.005, 0.012, 0.010), vec3(0.02, 0.05, 0.04), uDay);
    sil += vec3(0.05, 0.13, 0.09) * exp(-h * 24.0) * 0.6;                   // mist at the base
    sil += vec3(0.40, 0.92, 0.60) * rim * exp(-r * 1.7 * k) * 0.6;          // backlit rim
    c = mix(c, sil, cov);
    float bA = (uSceneA > 0.5 && uSceneA < 1.5) ? 1.0 - uMix : 0.0;
    float bB = (uSceneB > 0.5 && uSceneB < 1.5) ? uMix : 0.0;
    float amt = max(bA, bB);
    if (amt > 0.001 && detail) {
      vec2 bp = sp - vec2(0.0, (1.0 - amt) * -0.03);
      vec4 bl = balloons(bp, aspect, amt);
      c = mix(c, bl.rgb, bl.a);
    }
  }
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
    ["uRes", "uTime", "uMouse", "uStir", "uSun", "uR", "uHY", "uDay", "uSceneA", "uSceneB", "uMix"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
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
      gl.uniform1f(U.uSceneA, s.sa || 0);
      gl.uniform1f(U.uSceneB, s.sb || 0);
      gl.uniform1f(U.uMix, s.mix || 0);
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
    const SC = { a: 0, b: 0, mix: 0 };   // landscape on the horizon — driven by main.js
    hero._scene = { state: SC };
    const ok = mount(hero, {
      state: (aspect, mx) => {
        setS += (setK - setS) * 0.12;
        const r = 0.17 * Math.min(1, Math.max(0.62, aspect / 1.6));
        const sx = 0.5 + 0.12 * Math.min(1, Math.max(0, (aspect - 1) / 0.8));
        return { x: sx + (mx - 0.5) * 0.035, y: HY - setS * r * 0.85, r, hy: HY, day: 0.12 * (1 - setS), sa: SC.a, sb: SC.b, mix: SC.mix };
      }
    });
    if (ok) hero.dataset.gl = "on";
  }

  /* ---------------- home: tourism segments ---------------- */
  const tourCv = document.querySelector('[data-scene="tour"]');
  if (tourCv) {
    const S = { a: 0, b: 0, mix: 0, e: 0.18, day: 0.32 };   // driven by main.js
    const HY = 0.4;
    const api = mount(tourCv, {
      state: (aspect, mx) => {
        const r = 0.1 * Math.min(1.2, Math.max(0.7, aspect / 2.2));
        return { x: 0.62 + (mx - 0.5) * 0.02, y: HY - r * 0.5 + S.e * (0.82 - HY), r, hy: HY, day: S.day, sa: S.a, sb: S.b, mix: S.mix };
      }
    });
    tourCv._scene = { state: S, redraw: api ? api.redraw : () => {} };
    if (!api) tourCv.closest(".tour__stage").classList.add("no-gl");
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
