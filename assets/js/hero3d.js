/* =========================================================
   Hero — real-time 3D scene (Three.js r160)
   Emerald dawn over the Aegean: atmospheric sky shader with a
   half-risen green sun, twinkling stars, a mirror-reflective
   rippling sea (three/addons Water), volumetric procedural
   islands with soft shadows and aerial perspective, a
   lighthouse with a sweeping beam, and bloom.
   Tiers: high (desktop) / low (phones, weak CPUs) + adaptive
   resolution. Static photo stays underneath as the fallback
   (no WebGL, reduced motion, while loading).
   ========================================================= */
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const canvas = document.querySelector("[data-hero3d]");
const hero = canvas && canvas.closest(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch (e) { return false; }
}

if (canvas && !reduce && webglOK()) init();

function init() {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const LOW = coarse || cores <= 4 || mem <= 4;
  const T = LOW
    ? { pr: 1.25, seg: 110, water: 256, shadows: false, bloom: false, stars: 900 }
    : { pr: 1.75, seg: 220, water: 512, shadows: true, bloom: true, stars: 1800 };

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: "high-performance", alpha: false });
  let pr = Math.min(window.devicePixelRatio || 1, T.pr);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (T.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;    // static terrain: re-render shadows only when the sun moves
  }

  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x0b2a20);
  scene.fog = new THREE.FogExp2(FOG, 0.00042);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 12000);
  camera.position.set(0, 7, 60);

  /* ---------- sun ---------- */
  const sun = new THREE.Vector3();
  let sunNdcX = 0.24, sunElev = 0.0;
  const sunAzimuth = () => {
    // place the sun at a chosen screen x for the current aspect
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    return Math.atan(sunNdcX * Math.tan(hf));
  };
  const setSun = () => {
    const az = sunAzimuth();
    sun.set(Math.sin(az), Math.sin(sunElev), -Math.cos(az)).normalize();
  };

  /* ---------- sky ---------- */
  const skyU = { uSun: { value: sun }, uTime: { value: 0 }, uDim: { value: 1 }, uLow: { value: T.bloom ? 0 : 1 } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4500, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uSun; uniform float uTime, uDim, uLow; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          float az = dot(normalize(d.xz + 1e-5), normalize(uSun.xz + 1e-5)) * 0.5 + 0.5;
          vec3 zen = vec3(0.0035, 0.0085, 0.0075);
          vec3 hor = mix(vec3(0.008, 0.026, 0.021), vec3(0.05, 0.17, 0.115), pow(az, 8.0));
          vec3 c = mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.42));
          c += vec3(0.08, 0.27, 0.18) * exp(-abs(h) * 22.0) * pow(az, 9.0);       // horizon glow
          float ang = acos(clamp(dot(d, uSun), -1.0, 1.0));
          c += vec3(0.18, 0.56, 0.36) * exp(-ang * 9.0) * 0.32;                   // wide halo
          c += vec3(0.45, 1.00, 0.68) * exp(-ang * 55.0) * (0.55 + uLow * 0.6);   // inner glow
          // god rays: soft angular streaks around the sun
          float a2 = atan(d.y - uSun.y, (d.x - uSun.x) * 1.0);
          float rays = (0.5 + 0.5 * sin(a2 * 17.0 + uTime * 0.05)) * (0.5 + 0.5 * sin(a2 * 31.0 - uTime * 0.03 + 1.7)) * (0.6 + 0.4 * sin(a2 * 5.0 + 0.6));
          c += vec3(0.10, 0.32, 0.21) * pow(rays, 1.6) * exp(-ang * 6.0) * smoothstep(0.035, 0.08, ang) * smoothstep(-0.02, 0.06, h) * 0.22;
          float R = 0.034;
          float disc = smoothstep(R + 0.0012, R - 0.0012, ang);
          vec3 sc = mix(vec3(0.42, 0.95, 0.62), vec3(1.7, 2.0, 1.8), pow(smoothstep(R, 0.0, ang), 0.7));
          c = mix(c, sc, disc);
          gl_FragColor = vec4(c * uDim, 1.0);
        }`
    })
  );
  scene.add(sky);

  /* ---------- stars ---------- */
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(T.stars * 3), ph = new Float32Array(T.stars), sz = new Float32Array(T.stars);
  let n = 0;
  while (n < T.stars) {
    const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1);
    if (v.lengthSq() > 1 || v.y < 0.03) continue;
    v.normalize().multiplyScalar(4300);
    sp.set([v.x, v.y, v.z], n * 3);
    ph[n] = Math.random() * 6.283;
    sz[n] = 0.6 + Math.pow(Math.random(), 6) * 3.2;
    n++;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  const starU = { uTime: { value: 0 }, uPR: { value: pr }, uSun: { value: sun }, uDim: { value: 1 } };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `
      attribute float aPhase; attribute float aSize; uniform float uTime, uPR; uniform vec3 uSun; varying float vA;
      void main(){
        vec3 d = normalize(position);
        float tw = 0.55 + 0.45 * sin(uTime * (0.8 + fract(aPhase) * 2.4) + aPhase * 9.0);
        float glare = smoothstep(0.55, 0.05, acos(clamp(dot(d, uSun), -1.0, 1.0)));
        vA = tw * smoothstep(0.03, 0.22, d.y) * (1.0 - glare);
        gl_PointSize = aSize * uPR * (0.85 + 0.3 * tw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uDim; varying float vA;
      void main(){
        vec2 q = gl_PointCoord - 0.5; float r = length(q);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vec3(0.86, 1.0, 0.93) * a * vA * 1.6 * uDim, a * vA);
      }`
  }));
  scene.add(stars);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x4a8a70, 0x0b120f, 1.15);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xb3d8c8, 0.95);   // faint cool fill from the viewer's side
  fill.position.set(-120, 90, 260);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0x9df0bf, 2.4);
  key.target.position.set(60, 0, -160);
  scene.add(key, key.target);
  if (T.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 10; sc.far = 1600;
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.6; key.shadow.radius = 4;
  }
  const placeKey = () => key.position.copy(key.target.position).addScaledVector(sun, 700).setY(Math.max(18, sun.y * 700 + 18));

  /* ---------- terrain ---------- */
  const perlin = new ImprovedNoise();
  const fbm = (x, z, oct, seed) => {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * perlin.noise(x * f, seed + i * 7.31, z * f); f *= 2.03; a *= 0.5; }
    return v;                                   // ~[-0.7, 0.7]
  };
  const ridged = (x, z, oct, seed) => {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * (1 - Math.abs(perlin.noise(x * f, seed + i * 3.7, z * f))); f *= 2.1; a *= 0.5; }
    return v;                                   // ~[0, 1]
  };
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function islandHeight(I, x, z) {
    const fq = 2.6 / I.rx;
    let u = (x - I.cx) / I.rx, v = (z - I.cz) / I.rz;
    u += 0.28 * fbm(x * fq * 0.6, z * fq * 0.6, 3, I.seed + 11);
    v += 0.28 * fbm(x * fq * 0.6 + 40, z * fq * 0.6, 3, I.seed + 23);
    const d = Math.hypot(u, v);
    const mask = 1 - sstep(0.25, 1.0, d);
    const body = Math.pow(mask, I.shape) * I.h;
    const det = fbm(x * fq, z * fq, 5, I.seed) * 0.5 + 0.5;
    const rid = ridged(x * fq * 1.7, z * fq * 1.7, 4, I.seed + 5);
    let y = body * (0.55 + 0.6 * det) + mask * I.h * 0.16 * rid - (1 - mask) * 5 - 1.2;
    y += fbm(x * fq * 9, z * fq * 9, 2, I.seed + 3) * mask * I.h * 0.025;   // rock grain
    return Math.max(y, -7);
  }

  const ROCK = new THREE.Color(0xb3aa98), ROCK2 = new THREE.Color(0xd6cdb8), VEG = new THREE.Color(0x3d5a3a), VEG2 = new THREE.Color(0x58704a), WET = new THREE.Color(0x3a3d3a);
  // CC0 PBR rock (Poly Haven "Rock Face 03"): albedo, OpenGL normal, roughness
  const tl = new THREE.TextureLoader();
  const tex = (u, srgb) => { const t = tl.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = LOW ? 2 : 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true, metalness: 0.0, roughness: 1.0,
    map: tex("assets/tex/rock_diff.jpg", true),
    normalMap: tex("assets/tex/rock_nor.jpg"), normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: tex("assets/tex/rock_rough.jpg"),
    envMapIntensity: 0.5
  });
  function makeIsland(I) {
    const segs = Math.max(24, Math.round(T.seg * I.detail));
    const g = new THREE.PlaneGeometry(I.rx * 2.6, I.rz * 2.6, segs, Math.max(16, Math.round(segs * I.rz / I.rx)));
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * I.rx * 2.6 / 14, uv.getY(i) * I.rz * 2.6 / 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + I.cx, z = p.getZ(i) + I.cz;
      p.setXYZ(i, x, islandHeight(I, x, z), z);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = nrm.getY(i);
      const vn = fbm(x * 0.05, z * 0.05, 2, I.seed + 91) * 0.5 + 0.5;
      c.copy(ROCK).lerp(ROCK2, vn);
      const veg = sstep(0.78, 0.92, ny) * sstep(1.5, I.h * 0.25, y) * (0.6 + 0.6 * fbm(x * 0.09, z * 0.09, 3, I.seed + 7));
      c.lerp(VEG.clone().lerp(VEG2, vn), Math.min(1, Math.max(0, veg)));
      c.lerp(WET, sstep(1.6, -0.4, y) * 0.85);                  // dark wet rock at the waterline
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, terrainMat);
    m.castShadow = m.receiveShadow = T.shadows && I.shadow;
    scene.add(m);
    return m;
  }

  const ISLANDS = [
    { cx: 66,   cz: -34,   rx: 34,  rz: 40,  h: 10,  shape: 1.25, seed: 1, detail: 1.0, shadow: true },   // foreground headland (right)
    { cx: 150,  cz: -300,  rx: 82,  rz: 46,  h: 34,  shape: 1.5,  seed: 2, detail: 0.75, shadow: true },  // lighthouse island
    { cx: 760,  cz: -1500, rx: 700, rz: 260, h: 190, shape: 1.6,  seed: 3, detail: 0.6, shadow: false },  // far range (right)
    { cx: -820, cz: -1750, rx: 520, rz: 220, h: 120, shape: 1.8,  seed: 4, detail: 0.5, shadow: false },  // far island (left)
    { cx: -330, cz: -640,  rx: 70,  rz: 30,  h: 16,  shape: 1.4,  seed: 5, detail: 0.35, shadow: false }  // islet (left)
  ];
  ISLANDS.forEach(makeIsland);

  /* ---------- lighthouse ---------- */
  const LH = ISLANDS[1];
  const lhX = LH.cx - 18, lhZ = LH.cz + 6;
  let lhY = -10;
  for (let dx = -10; dx <= 10; dx += 2) for (let dz = -10; dz <= 10; dz += 2) lhY = Math.max(lhY, islandHeight(LH, lhX + dx, lhZ + dz));
  const lh = new THREE.Group();
  lh.position.set(lhX, lhY - 0.6, lhZ);
  const prof = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(2.3 - 0.85 * t + (i === 0 ? 0.4 : 0), t * 15)); }
  const white = new THREE.MeshStandardMaterial({ color: 0xd9e4dc, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f1d, roughness: 0.7, metalness: 0.3 });
  const tower = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), white);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.94, 2.08, 2.4, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x5c1f1a, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  band.position.y = 6.5;
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.45, 32), dark); gallery.position.y = 15.2;
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.9, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 4.6, 3.6) }));
  lamp.position.y = 16.4;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.6, 24), dark); roof.position.y = 18.15;
  [tower, band, gallery, roof].forEach((m) => { m.castShadow = m.receiveShadow = T.shadows; });
  lh.add(tower, band, gallery, lamp, roof);
  const lampLight = new THREE.PointLight(0xc9ffd9, 30, 90, 2);
  lampLight.position.y = 16.4; lh.add(lampLight);
  // sweeping beam: two soft additive cones
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 1 } },
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = pow(vT, 2.2) * edge * 0.22 * uI; gl_FragColor = vec4(vec3(0.7, 1.0, 0.82) * a, a); }`
  });
  const beamPivot = new THREE.Group(); beamPivot.position.y = 16.4; lh.add(beamPivot);
  [0, Math.PI].forEach((r) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(16, 190, 32, 1, true), beamMat);
    cone.rotation.z = -Math.PI / 2; cone.position.x = 95;
    const holder = new THREE.Group(); holder.rotation.y = r; holder.add(cone); beamPivot.add(holder);
  });
  scene.add(lh);

  /* ---------- image-based lighting (CC0 HDRI, Poly Haven "Kloppenheim 06") ---------- */
  if (!LOW) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    new RGBELoader().load("assets/tex/dawn_1k.hdr", (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose(); pmrem.dispose();
      terrainMat.envMap = env; white.envMap = env; terrainMat.needsUpdate = white.needsUpdate = true;
      if (T.shadows) renderer.shadowMap.needsUpdate = true;
    });
  }

  /* ---------- water ---------- */
  const normals = new THREE.TextureLoader().load("assets/tex/waternormals.jpg", (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
    textureWidth: T.water, textureHeight: T.water, waterNormals: normals,
    sunDirection: sun.clone(), sunColor: 0x3f8a5e, waterColor: 0x010a07,
    distortionScale: 2.6, fog: true, alpha: 1.0
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 3.2;
  scene.add(water);

  /* ---------- post ---------- */
  let composer = null, bloom = null;
  if (T.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- layout / resize ---------- */
  const look = new THREE.Vector3();
  let baseYaw = 0, basePitch = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    const portrait = h > w;
    camera.aspect = w / h;
    camera.fov = portrait ? 58 : (w / h > 2 ? 34 : 40);
    sunNdcX = portrait ? 0.08 : (w < 1100 ? 0.18 : 0.26);
    basePitch = portrait ? -0.035 : -0.012;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); bloom.resolution.set(w * pr * 0.5, h * pr * 0.5); }
    setSun(); placeKey(); if (T.shadows) renderer.shadowMap.needsUpdate = true;
  }

  /* ---------- input ---------- */
  let mx = 0, my = 0, tmx = 0, tmy = 0, stir = 0, lastX = 0, lastY = 0, scrollK = 0;
  window.addEventListener("pointermove", (e) => {
    const x = e.clientX / innerWidth * 2 - 1, y = e.clientY / innerHeight * 2 - 1;
    stir = Math.min(1, stir + Math.hypot(x - lastX, y - lastY) * 2.2);
    lastX = x; lastY = y; tmx = x; tmy = y;
  }, { passive: true });
  window.addEventListener("pointerdown", () => { stir = Math.min(1, stir + 0.6); }, { passive: true });
  window.addEventListener("scroll", () => { scrollK = Math.min(1, scrollY / Math.max(1, hero.offsetHeight)); }, { passive: true });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let raf = 0, visible = true, first = true, frames = 0, slowF = 0, time = 0, lastSunY = 99, setK = 0;
  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;
    frames++; if (dt > 0.03) slowF++;
    if (frames === 120) {                                  // adaptive resolution
      if (slowF > 60 && pr > 0.8) { pr = Math.max(0.8, pr * 0.8); renderer.setPixelRatio(pr); resize(); }
      if (slowF > 90 && composer) { composer = null; skyU.uLow.value = 1; }
      frames = 0; slowF = 0;
    }
    mx += (tmx - mx) * 0.035; my += (tmy - my) * 0.035;
    stir *= Math.exp(-dt * 1.2);
    setK += (scrollK - setK) * 0.08;

    sunElev = -0.016 - setK * 0.07;
    setSun();
    if (Math.abs(sun.y - lastSunY) > 0.002) { placeKey(); lastSunY = sun.y; if (T.shadows) renderer.shadowMap.needsUpdate = true; }
    key.intensity = 2.4 * (1 - setK * 0.6);
    skyU.uDim.value = 1 - setK * 0.35;
    if (bloom) bloom.strength = 0.55 * (1 - setK * 0.5);

    // gentle camera breathing + pointer parallax
    camera.position.set(Math.sin(time * 0.05) * 1.5 + mx * 2.2, 7 + Math.sin(time * 0.11) * 0.25 - my * 0.8, 60);
    look.set(camera.position.x * 0.3 + Math.tan(baseYaw) * 100 + mx * 3, camera.position.y + (basePitch - my * 0.006) * 100, camera.position.z - 100);
    camera.lookAt(look);

    skyU.uTime.value = time; starU.uTime.value = time;
    const wu = water.material.uniforms;
    wu.time.value += dt * (0.42 + stir * 0.9);
    wu.distortionScale.value = 2.6 + stir * 3.5;
    wu.sunDirection.value.copy(sun);
    beamPivot.rotation.y = time * 0.55;
    lampLight.intensity = 30 + Math.sin(time * 7.0) * 2;

    if (composer) composer.render(); else renderer.render(scene, camera);
    if (first) { first = false; canvas.classList.add("is-live"); if (hero) hero.classList.add("has-3d"); }
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const start = () => { cancelAnimationFrame(raf); clock.getDelta(); raf = requestAnimationFrame(frame); };

  resize();
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); }, { passive: true });
  new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.classList.remove("is-live"); }, false);
  start();
}
