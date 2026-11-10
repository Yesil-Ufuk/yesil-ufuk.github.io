/* =========================================================
   Hero "horizon": perspective dot-terrain receding to a
   glowing horizon line. Reacts to pointer + scroll.
   ========================================================= */
(function () {
  const cv = document.querySelector("[data-horizon]");
  if (!cv || cv.dataset.gl === "on") return; // WebGL liquid (liquid.js) is running
  const ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, raf = 0, visible = true, t = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0, scrollK = 0;
  const COLS = 120, ROWS = 46;

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // cheap smooth pseudo-noise
  function wave(x, z, time) {
    return (
      Math.sin(x * 1.7 + time * 0.6) * 0.18 +
      Math.sin(z * 0.9 - time * 0.9 + x * 0.6) * 0.26 +
      Math.sin((x + z) * 2.3 + time * 0.4) * 0.07
    );
  }

  function frame() {
    t += 0.0085;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    ctx.clearRect(0, 0, W, H);
    const horizonY = H * (0.42 + scrollK * 0.1) + my * 14;
    const cx = W * 0.5 + mx * 40;
    const f = Math.max(W, 700) * 0.62;
    const camH = 1.25 + scrollK * 0.6;

    // horizon glow
    const g = ctx.createLinearGradient(0, horizonY - 70, 0, horizonY + 40);
    g.addColorStop(0, "rgba(143,227,168,0)");
    g.addColorStop(0.62, "rgba(143,227,168,0.10)");
    g.addColorStop(1, "rgba(143,227,168,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY - 70, W, 110);

    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, "rgba(143,227,168,0)");
    lg.addColorStop(0.5, "rgba(143,227,168,0.75)");
    lg.addColorStop(1, "rgba(143,227,168,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, horizonY, W, 1);

    // sun arc rising from horizon
    const sunR = Math.min(W, H) * 0.16;
    const sunY = horizonY + sunR * (0.55 - Math.sin(t * 0.35) * 0.06);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, horizonY);
    ctx.clip();
    const sg = ctx.createRadialGradient(cx, sunY, sunR * 0.2, cx, sunY, sunR * 1.9);
    sg.addColorStop(0, "rgba(143,227,168,0.16)");
    sg.addColorStop(1, "rgba(143,227,168,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(cx - sunR * 2, sunY - sunR * 2, sunR * 4, sunR * 2);
    ctx.strokeStyle = "rgba(143,227,168,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, sunY, sunR * (1 + i * 0.34), Math.PI, 0);
      ctx.globalAlpha = 0.55 - i * 0.085;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // terrain dots
    const zNear = 1.1, zFar = 16;
    const zShift = (t * 1.6) % ((zFar - zNear) / ROWS);
    for (let j = 0; j < ROWS; j++) {
      const z = zNear + (j / ROWS) * (zFar - zNear) - zShift;
      if (z <= 0.2) continue;
      const depth = 1 - (z - zNear) / (zFar - zNear);
      for (let i = 0; i < COLS; i++) {
        const x = ((i / (COLS - 1)) - 0.5) * 44;
        const y = wave(x * 0.25, z * 0.35 + t * 1.6, t);
        const sx = cx + ((x - mx * 0.6) / z) * f;
        const sy = horizonY + ((camH - y) / z) * f;
        if (sx < -10 || sx > W + 10 || sy > H + 10 || sy < horizonY) continue;
        const a = Math.min(1, Math.max(0, Math.min(1, depth * 1.25)) * (0.45 + (y + 0.5) * 0.8));
        const r = Math.max(0.4, depth * 1.7);
        const near = Math.max(0, (y - 0.15) * 2.2);
        ctx.fillStyle = near > 0.1
          ? `rgba(143,227,168,${(a * Math.min(1, near)).toFixed(3)})`
          : `rgba(255,255,255,${(a * 0.7).toFixed(3)})`;
        ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
      }
    }

    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  function start() { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }

  resize();
  window.addEventListener("resize", () => { resize(); if (reduce) frame(); }, { passive: true });
  window.addEventListener("pointermove", (e) => {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener("scroll", () => {
    scrollK = Math.min(1, window.scrollY / Math.max(1, H));
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((ents) => {
      visible = ents[0].isIntersecting;
      if (visible && !reduce) start();
    }).observe(cv);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (visible && !reduce) start();
  });

  if (reduce) frame(); else start();
})();
