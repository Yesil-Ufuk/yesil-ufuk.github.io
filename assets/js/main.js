/* =========================================================
   YEŞİL UFUK — motion & interaction
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const T = (k, fb) => (window.I18N ? window.I18N.t(k, fb) : fb);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  html.classList.add("curtain-ok");
  const curtain = $("[data-curtain]");
  const header = $("[data-hdr]");
  const barH = () => (header ? header.offsetHeight : 64);

  /* ---------------- No-GSAP fallback ---------------- */
  if (!G || !ST) {
    if (curtain) curtain.style.transform = "translateY(-105%)";
    initMenus(null);
    initLang();
    initForm();
    initClock();
    return;
  }
  G.registerPlugin(ST);

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4
    });
    lenis.on("scroll", ST.update);
    G.ticker.add((time) => lenis.raf(time * 1000));
    G.ticker.lagSmoothing(0);
  }
  const scrollTo = (target, offset) => {
    const off = offset == null ? -(barH() + 12) : offset;
    if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.4 });
    else {
      const y = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY + off;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  };

  /* ---------------- Sound (synthesised, opt-in) ---------------- */
  const Sound = (() => {
    let ac = null, master = null, amb = null, on = false, last = 0;
    const btn = $("[data-sound-toggle]");
    const label = $("[data-sound-label]");
    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 40;
      master.connect(hp); hp.connect(ac.destination);
      // ambient pad
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = .7;
      const g = ac.createGain(); g.gain.value = .028;
      [55, 82.41, 110.3].forEach((f, i) => {
        const o = ac.createOscillator();
        o.type = i === 2 ? "triangle" : "sine";
        o.frequency.value = f; o.detune.value = (i - 1) * 6;
        o.connect(lp); o.start();
      });
      const lfo = ac.createOscillator(); const lg = ac.createGain();
      lfo.frequency.value = .07; lg.gain.value = 180;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      lp.connect(g); g.connect(master);
      amb = g;
      return true;
    }
    function tick(kind) {
      if (!on || !ac) return;
      const now = ac.currentTime;
      if (now - last < .035) return;
      last = now;
      const o = ac.createOscillator(); const g = ac.createGain();
      const f = kind === "click" ? 760 : 2100 + Math.random() * 500;
      o.type = kind === "click" ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, now);
      o.frequency.exponentialRampToValueAtTime(f * .55, now + .07);
      g.gain.setValueAtTime(kind === "click" ? .07 : .022, now);
      g.gain.exponentialRampToValueAtTime(.0001, now + (kind === "click" ? .12 : .06));
      o.connect(g); g.connect(master);
      o.start(now); o.stop(now + .14);
    }
    function setLabel() {
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(on));
      if (label) label.textContent = on ? T("sound.on", "Ses Açık") : T("sound.off", "Ses Kapalı");
    }
    function set(v) {
      if (v && !ac && !build()) return;
      on = v;
      if (ac) {
        const now = ac.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        if (on) { ac.resume(); master.gain.linearRampToValueAtTime(1, now + .6); }
        else { master.gain.linearRampToValueAtTime(0, now + .35); setTimeout(() => { if (!on) ac.suspend(); }, 450); }
      }
      store.set("yu-sound", on ? "1" : "0");
      setLabel();
    }
    if (btn) btn.addEventListener("click", () => { set(!on); tick("click"); });
    if (store.get("yu-sound") === "1") {
      const arm = () => { set(true); window.removeEventListener("pointerdown", arm); window.removeEventListener("keydown", arm); };
      window.addEventListener("pointerdown", arm, { once: true });
      window.addEventListener("keydown", arm, { once: true });
    }
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest && e.target.closest("a, button, [data-sound], .dg-node");
      if (el && !el.contains(e.relatedTarget)) tick("hover");
    });
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("a, button")) tick("click"); });
    setLabel();
    return { tick, setLabel };
  })();

  /* ---------------- Header: state, hide, progress ---------------- */
  (function initHeader() {
    if (!header) return;
    const prog = $("[data-progress]");
    let lastY = 0;
    const onScroll = (y) => {
      header.classList.toggle("is-scrolled", y > 24);
      const goingDown = y > lastY + 2, goingUp = y < lastY - 2;
      if (goingDown && y > 220 && !html.classList.contains("menu-open")) header.classList.add("is-hidden");
      else if (goingUp || y < 220) header.classList.remove("is-hidden");
      lastY = y;
    };
    if (lenis) lenis.on("scroll", (e) => onScroll(e.scroll));
    else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
    onScroll(window.scrollY);
    if (prog) {
      ST.create({
        start: 0, end: "max",
        onUpdate: (self) => { prog.style.transform = `scaleX(${self.progress.toFixed(4)})`; }
      });
    }
    header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  })();

  /* ---------------- Menus ---------------- */
  initMenus(lenis);
  function initMenus(lenisRef) {
    // Mega menu
    const root = $("[data-mega-root]"), btn = $("[data-mega-btn]"), mega = $("[data-mega]");
    if (root && btn && mega) {
      let tmr;
      const open = (v) => {
        clearTimeout(tmr);
        btn.setAttribute("aria-expanded", String(v));
        mega.classList.toggle("is-open", v);
        if (v && window.gsap && !reduce) {
          window.gsap.fromTo($$(".mega__a", mega), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5, ease: "expo.out", stagger: .04, overwrite: true });
        }
      };
      btn.addEventListener("click", () => open(btn.getAttribute("aria-expanded") !== "true"));
      if (finePointer) {
        root.addEventListener("pointerenter", () => open(true));
        root.addEventListener("pointerleave", () => { tmr = setTimeout(() => open(false), 160); });
      }
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mega.classList.contains("is-open")) { open(false); btn.focus(); } });
      document.addEventListener("click", (e) => { if (!root.contains(e.target)) open(false); });
      root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) open(false); });
    }

    // Mobile menu
    const burger = $("[data-burger]"), mnav = $("[data-mnav]");
    if (!burger || !mnav) return;
    const links = $$(".mnav__list li > a", mnav);
    const foot = $(".mnav__foot", mnav);
    let isOpen = false;
    const set = (v) => {
      isOpen = v;
      burger.setAttribute("aria-expanded", String(v));
      mnav.setAttribute("aria-hidden", String(!v));
      html.classList.toggle("menu-open", v);
      if (v) { lenisRef && lenisRef.stop(); header && header.classList.remove("is-hidden"); }
      else lenisRef && lenisRef.start();
      const g = window.gsap;
      if (!g || reduce) {
        mnav.style.visibility = v ? "visible" : "hidden";
        mnav.style.clipPath = v ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)";
        return;
      }
      if (v) {
        g.set(mnav, { visibility: "visible" });
        g.to(mnav, { clipPath: "inset(0 0 0% 0)", duration: .8, ease: "expo.inOut", overwrite: true });
        g.fromTo(links, { yPercent: 125 }, { yPercent: 0, duration: .9, ease: "expo.out", stagger: .06, delay: .3, overwrite: true });
        g.fromTo(foot, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .8, ease: "expo.out", delay: .55, overwrite: true });
      } else {
        g.to(links, { yPercent: -110, duration: .32, ease: "power3.in", stagger: .02, overwrite: true });
        g.to(mnav, { clipPath: "inset(0 0 100% 0)", duration: .7, ease: "expo.inOut", delay: .18, overwrite: true, onComplete: () => g.set(mnav, { visibility: "hidden" }) });
      }
    };
    burger.addEventListener("click", () => set(!isOpen));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) { set(false); burger.focus(); } });
    $$("a", mnav).forEach((a) => a.addEventListener("click", () => isOpen && set(false)));
    window.addEventListener("resize", () => { if (isOpen && window.innerWidth > 1180) set(false); });
  }

  /* ---------------- Language ---------------- */
  initLang();
  function initLang() {
    $$("[data-lang]").forEach((b) => b.addEventListener("click", () => window.I18N && window.I18N.set(b.dataset.lang)));
  }

  /* ---------------- Text helpers ---------------- */
  function scramble(el) {
    if (reduce || !el) return;
    cancelAnimationFrame(el._scr || 0);
    const final = el.textContent;
    const glyphs = "ABCDEFGHJKLMNPRSTUVYZ0123456789/·—+";
    const len = final.length;
    let f = 0;
    const total = Math.min(34, 14 + len);
    const step = () => {
      f++;
      let out = "";
      for (let i = 0; i < len; i++) {
        const reveal = (i / len) * total * .7 + 4;
        out += (f >= reveal || final[i] === " ") ? final[i] : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
      if (f < total) el._scr = requestAnimationFrame(step);
      else el.textContent = final;
    };
    el._scr = requestAnimationFrame(step);
  }

  const inkTriggers = [];
  function initInk() {
    inkTriggers.splice(0).forEach((t) => t.kill());
    $$("[data-ink]").forEach((el) => {
      const src = el.innerHTML.trim();
      el.innerHTML = src.split(/(\s+)/).map((w) => (/^\s+$/.test(w) || !w ? w : `<span class="w">${w}</span>`)).join("");
      const words = $$(".w", el);
      if (reduce) { G.set(words, { "--p": 112 }); return; }
      const tw = G.fromTo(words, { "--p": -12 }, {
        "--p": 112, ease: "none", stagger: .08, duration: .6,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 42%", scrub: .6 }
      });
      inkTriggers.push(tw.scrollTrigger);
    });
  }

  /* ---------------- Reveals ---------------- */
  const heroLines = $$("[data-hero] .split .ln > span");
  const heroFade = $$("[data-hero] [data-hero-fade]");

  function initReveals() {
    // masked lines (non-hero)
    $$(".split").forEach((el) => {
      if (el.closest("[data-hero]")) return;
      const lines = $$(".ln > span", el);
      G.set(lines, { yPercent: 125 });
      ST.create({
        trigger: el, start: "top 90%", once: true,
        onEnter: () => G.to(lines, { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: .08 })
      });
    });
    // fade-up
    $$("[data-reveal]").forEach((el) => {
      if (el.closest("[data-hero]")) return;
      G.set(el, { autoAlpha: 0, y: 18 });
      ST.create({ trigger: el, start: "top 92%", once: true, onEnter: () => G.to(el, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", delay: +(el.dataset.delay || 0) }) });
    });
    // stagger groups
    $$("[data-stagger]").forEach((wrap) => {
      const kids = Array.from(wrap.children);
      G.set(kids, { autoAlpha: 0, y: 40 });
      ST.batch(kids, {
        start: "top 92%", once: true,
        onEnter: (batch) => G.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: .09 })
      });
    });
    // scramble labels
    $$("[data-scramble]").forEach((el) => {
      if (el.closest("[data-hero]")) return;
      ST.create({ trigger: el, start: "top 92%", once: true, onEnter: () => scramble(el) });
    });
    // horizontal rules
    $$("[data-line]").forEach((el) => {
      G.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 95%", once: true } });
    });
    // steps
    $$(".steps").forEach((wrap) => {
      const bars = $$(".step__bar", wrap);
      ST.create({ trigger: wrap, start: "top 85%", once: true, onEnter: () => G.to(bars, { scaleX: 1, duration: 1.2, ease: "expo.inOut", stagger: .12 }) });
    });
    // outlined service numbers
    $$(".svc__num span").forEach((el) => {
      G.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    // footer wordmark
    const word = $$("[data-ftr-word] span");
    if (word.length) {
      G.set(word, { yPercent: 100 });
      ST.create({ trigger: "[data-ftr-word]", start: "top 98%", once: true, onEnter: () => G.to(word, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: .04 }) });
    }
    // cta glow parallax
    const glow = $(".cta__glow");
    if (glow) G.fromTo(glow, { yPercent: 30, scale: .8 }, { yPercent: -10, scale: 1.1, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true } });
    // inner-page hero decorative drift
    $$("[data-parallax]").forEach((el) => {
      G.to(el, { yPercent: +(el.dataset.parallax || 20), ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true } });
    });
  }

  /* ---------------- Hero intro ---------------- */
  function heroIntro(delay) {
    if (heroLines.length) {
      G.fromTo(heroLines, { yPercent: 125 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: .08, delay: delay + .14, overwrite: true });
    }
    if (heroFade.length) {
      G.fromTo(heroFade, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: .08, delay: delay + .45, overwrite: true });
    }
    $$("[data-hero] [data-scramble]").forEach((el, i) => setTimeout(() => scramble(el), (delay + .2 + i * .1) * 1000));
    const rule = $("[data-hero] [data-line]");
    if (rule) G.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "expo.inOut", delay: delay + .3 });
  }
  if (heroLines.length) G.set(heroLines, { yPercent: 125 });
  if (heroFade.length) G.set(heroFade, { autoAlpha: 0 });

  /* ---------------- Curtain transitions ---------------- */
  (function initCurtain() {
    if (!curtain) { heroIntro(0); return; }
    const label = $("[data-curtain-label]", curtain);
    G.set(curtain, { yPercent: 0, y: 0 });
    if (reduce) { G.set(curtain, { yPercent: -105 }); heroIntro(0); }
    else {
      G.to(curtain, { yPercent: -105, duration: .9, ease: "power4.inOut", delay: .2 });
      heroIntro(.55);
    }
    window.addEventListener("pageshow", (e) => { if (e.persisted) G.set(curtain, { yPercent: -105 }); });

    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin && url.protocol !== "file:") return;
      const samePage = url.pathname === location.pathname && url.search === location.search;
      if (samePage && url.hash) {
        const t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (t) { e.preventDefault(); scrollTo(t, -(barH() + stickyExtra(t) + 12)); history.replaceState(null, "", url.hash); }
        return;
      }
      if (samePage && !url.hash) { e.preventDefault(); scrollTo(0, 0); return; }
      e.preventDefault();
      if (label) label.textContent = (a.textContent || "").replace(/\s+/g, " ").replace(/[→↗]/g, "").trim().slice(0, 48) || window.SITE.brand;
      G.fromTo(curtain, { yPercent: 105 }, { yPercent: 0, duration: .6, ease: "power3.inOut", onComplete: () => { location.href = url.href; } });
    });
  })();

  function stickyExtra(target) {
    const sn = $(".svc__nav");
    return sn && target.closest(".svc") ? sn.offsetHeight : 0;
  }

  /* ---------------- Marquee (scroll-velocity aware) ---------------- */
  (function initMarquee() {
    $$("[data-marquee]").forEach((mq) => {
      const track = $(".marquee__track", mq);
      const group = $(".marquee__group", track);
      if (!track || !group || reduce) return;
      const clone = group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
      const tw = G.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
      tw.totalTime(tw.duration() * 500);
      let target = 1, current = 1;
      if (lenis) lenis.on("scroll", (e) => {
        const v = e.velocity || 0;
        target = (v < 0 ? -1 : 1) * (1 + Math.min(Math.abs(v) * .35, 6));
      });
      G.ticker.add(() => {
        current += (target - current) * .08;
        target += ((target < 0 ? -1 : 1) - target) * .05;
        tw.timeScale(current);
      });
      mq._langRefresh = () => { clone.innerHTML = group.innerHTML; };
    });
  })();

  /* ---------------- Magnetic + cursor ---------------- */
  (function initMagnetic() {
    if (!finePointer || reduce) return;
    $$("[data-magnetic]").forEach((el) => {
      const xTo = G.quickTo(el, "x", { duration: .6, ease: "power3.out" });
      const yTo = G.quickTo(el, "y", { duration: .6, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .28);
        yTo((e.clientY - (r.top + r.height / 2)) * .4);
      });
      el.addEventListener("pointerleave", () => G.to(el, { x: 0, y: 0, duration: .82, ease: "expo.out", overwrite: true }));
    });
    const cur = $("[data-cursor]");
    if (!cur) return;
    const cx = G.quickTo(cur, "x", { duration: .35, ease: "power3.out" });
    const cy = G.quickTo(cur, "y", { duration: .35, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => { cur.classList.add("is-on"); cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    document.addEventListener("pointerover", (e) => {
      const hit = e.target.closest && e.target.closest("a, button, .dg-node, label, select, [data-cursor-hover]");
      cur.classList.toggle("is-hover", !!hit);
    });
  })();

  /* ---------------- Card spotlight ---------------- */
  $$(".card").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------------- Tilt + spotlight cards ---------------- */
  if (finePointer && !reduce) {
    $$("[data-tilt]").forEach((el) => {
      const rx = G.quickTo(el, "rotationX", { duration: .7, ease: "power3.out" });
      const ry = G.quickTo(el, "rotationY", { duration: .7, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        ry((x - 0.5) * 6); rx((0.5 - y) * 5);
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------------- Operating-model diagram ---------------- */
  const Diagram = (() => {
    const host = $("[data-model]");
    if (!host) return null;
    const stage = $(".model__canvas", host);
    const svg = $(".model__svg", host);
    const out = {
      k: $("[data-dg-k]", host), t: $("[data-dg-t]", host), s: $("[data-dg-s]", host),
      d: $("[data-dg-d]", host), hint: $("[data-dg-hint]", host),
      count: $("[data-dg-count]", host), track: $("[data-dg-track]", host)
    };
    const NS = "http://www.w3.org/2000/svg";

    const TXT = {
      tr: {
        ctrl: "YÖNETİŞİM KATMANI", flow: "İŞLETİM AKIŞI", loop: "SÜREKLİ İYİLEŞTİRME DÖNGÜSÜ",
        hover: "Bir aşamanın üzerine gelerek inceleyin", tap: "İncelemek için bir aşamaya dokunun",
        intro: "Kaydırdıkça model kurulur.", introD: "Şirketinizin işletim modeli; akış katmanı ve onu çevreleyen yönetişim katmanından oluşur.",
        laneF: "İşletim akışı", laneC: "Yönetişim katmanı",
        f1: ["Mevcut Durum", "ANALİZ / VERİ", "Finansal tablolar, organizasyon ve süreçlerin röntgeni: ne çalışıyor, ne kaybettiriyor?"],
        f2: ["Strateji", "HEDEF / ROTA", "Pazar, rekabet ve kaynaklara göre önceliklendirilmiş, ölçülebilir hedefler ve yol haritası."],
        f3: ["Organizasyon", "ROL / YETKİ", "Kim neye karar verir? Görev tanımları, yetki matrisi ve organizasyon şeması."],
        f4: ["Süreçler", "SOP / DİJİTAL", "Standart iş akışları, prosedürler ve doğru yazılım araçlarıyla tekrarlanabilir operasyon."],
        f5: ["Performans", "KPI / RAPORLAMA", "Yönetim panoları ve düzenli raporlarla sapmaların erken tespiti."],
        c1: ["Kalite & Standartlar", "STANDART / GELİŞİM", "Süreç standartları, kalite hedefleri ve düzenli iç gözden geçirmelerle tutarlı bir işleyiş.", "Kalite"],
        c2: ["Yönetim Ritmi", "TOPLANTI / KARAR", "Yönetim toplantıları, karar kayıtları ve sorumluluk takibiyle düzenli bir yönetim takvimi.", "Yönetim"],
        c3: ["Finansal Kontrol", "BÜTÇE / MALİYET", "Bütçe disiplini, gelir–gider planlaması ve maliyet kontrolüyle yönetim için görünürlük.", "Finans"]
      },
      en: {
        ctrl: "GOVERNANCE LAYER", flow: "OPERATING FLOW", loop: "CONTINUOUS IMPROVEMENT LOOP",
        hover: "Hover a stage to inspect", tap: "Tap a stage to inspect",
        intro: "The model builds as you scroll.", introD: "A company's operating model: an operating flow, wrapped by a governance layer.",
        laneF: "Operating flow", laneC: "Governance layer",
        f1: ["Current State", "ANALYSIS / DATA", "An X-ray of financials, organisation and processes: what works, and what leaks value?"],
        f2: ["Strategy", "GOALS / ROADMAP", "Measurable goals and a roadmap, prioritised by market, competition and resources."],
        f3: ["Organisation", "ROLES / AUTHORITY", "Who decides what? Job descriptions, an authority matrix and the org chart."],
        f4: ["Processes", "SOP / DIGITAL", "Standard workflows, procedures and the right software for repeatable operations."],
        f5: ["Performance", "KPI / REPORTING", "Management dashboards and regular reporting to catch deviations early."],
        c1: ["Quality & Standards", "STANDARDS / GROWTH", "Consistent operations through process standards, quality goals and regular internal reviews.", "Quality"],
        c2: ["Management Rhythm", "MEETINGS / DECISIONS", "A steady management calendar: board meetings, decision logs and accountability tracking.", "Governance"],
        c3: ["Financial Control", "BUDGET / COST", "Visibility for management through budget discipline, income–expense planning and cost control.", "Finance"]
      }
    };
    const lang = () => (window.I18N ? window.I18N.lang() : "tr");
    const L = () => TXT[lang()] || TXT.tr;

    const FLOW = ["f1", "f2", "f3", "f4", "f5"];
    const CTRL = ["c1", "c2", "c3"];
    const ORDER = [...FLOW, ...CTRL];
    let vertical = false, active = null, pinned = null, scrollActive = null;
    let tl = null, live = false, raf = 0, pulses = [];

    function layout(v) {
      if (!v) {
        const W = 1200, H = 600, fw = 172, fh = 104, cw = 236, ch = 80;
        const fx = [130, 365, 600, 835, 1070], fy = 372, cy = 136, cx = [300, 600, 900];
        const nodes = {};
        FLOW.forEach((id, i) => (nodes[id] = { x: fx[i] - fw / 2, y: fy - fh / 2, w: fw, h: fh, cx: fx[i], cy: fy, kind: "flow", n: `0${i + 1}` }));
        CTRL.forEach((id, i) => (nodes[id] = { x: cx[i] - cw / 2, y: cy - ch / 2, w: cw, h: ch, cx: cx[i], cy, kind: "ctrl", n: `G${i + 1}` }));
        const edges = [];
        for (let i = 0; i < 4; i++) edges.push({ k: "flow", d: `M${fx[i] + fw / 2},${fy} H${fx[i + 1] - fw / 2}`, from: FLOW[i] });
        const top = fy - fh / 2, cb = cy + ch / 2, bus = 236;
        edges.push({ k: "ctrl", d: `M${cx[0]},${cb} V${bus} H${fx[0]} V${top}`, from: "c1" });
        edges.push({ k: "ctrl", d: `M${cx[0]},${cb} V${bus} H${fx[1]} V${top}`, from: "c1" });
        edges.push({ k: "ctrl", d: `M${cx[1]},${cb} V${top}`, from: "c2" });
        edges.push({ k: "ctrl", d: `M${cx[2]},${cb} V${bus} H${fx[3]} V${top}`, from: "c3" });
        edges.push({ k: "ctrl", d: `M${cx[2]},${cb} V${bus} H${fx[4]} V${top}`, from: "c3" });
        const bot = fy + fh / 2;
        const loop = `M${fx[4]},${bot} V510 H${fx[0]} V${bot}`;
        return {
          W, H, nodes, edges, loop, spine: `M${fx[0]},${fy} H${fx[4]}`,
          lanes: [{ d: `M40,268 H1160` }], labels: [{ x: 40, y: 44, k: "ctrl" }, { x: 40, y: 300, k: "flow" }],
          loopLabel: { x: 600, y: 536, anchor: "middle" }
        };
      }
      // compact "snake" layout for narrow / portrait stages
      const W = 400, H = 520, fw = 176, fh = 88, cw = 118, ch = 56;
      const P = { f1: [102, 196], f2: [298, 196], f3: [298, 318], f4: [102, 318], f5: [102, 440] };
      const cx = [67, 200, 333], cyy = 50;
      const nodes = {};
      FLOW.forEach((id, i) => (nodes[id] = { x: P[id][0] - fw / 2, y: P[id][1] - fh / 2, w: fw, h: fh, cx: P[id][0], cy: P[id][1], kind: "flow", n: `0${i + 1}` }));
      CTRL.forEach((id, i) => (nodes[id] = { x: cx[i] - cw / 2, y: cyy - ch / 2, w: cw, h: ch, cx: cx[i], cy: cyy, kind: "ctrl", n: `G${i + 1}` }));
      const edges = [
        { k: "flow", d: "M190,196 H210", from: "f1" },
        { k: "flow", d: "M298,240 V274", from: "f2" },
        { k: "flow", d: "M210,318 H190", from: "f3" },
        { k: "flow", d: "M102,362 V396", from: "f4" },
        { k: "ctrl", d: "M67,78 V120 H90 V152", from: "c1" },
        { k: "ctrl", d: "M200,78 V130 H114 V152", from: "c2" },
        { k: "ctrl", d: "M200,78 V130 H286 V152", from: "c2" },
        { k: "ctrl", d: "M333,78 V120 H310 V152", from: "c3" }
      ];
      return {
        W, H, nodes, edges, loop: "M14,440 H6 V196 H14", spine: "M102,196 H298 V318 H102 V440",
        lanes: [{ d: `M10,104 H${W - 10}` }], labels: [{ x: 10, y: 12, k: "ctrl" }, { x: 10, y: 126, k: "flow" }],
        loopLabel: { x: 298, y: 432, anchor: "middle", wrap: true }
      };
    }

    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };

    function render() {
      cancelAnimationFrame(raf); live = false;
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); tl = null; }
      const r = stage.getBoundingClientRect();
      vertical = r.width < 720 || r.width / Math.max(1, r.height) < 1.05;
      const Ly = layout(vertical), tx = L();
      svg.innerHTML = "";
      svg.setAttribute("viewBox", `0 0 ${Ly.W} ${Ly.H}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.classList.toggle("is-vertical", vertical);
      const defs = el("defs", {}, svg);

      const gL = el("g", { class: "dg-lanes" }, svg);
      Ly.lanes.forEach((l) => el("path", { d: l.d, class: "dg-lane" }, gL));
      Ly.labels.forEach((l) => { const t = el("text", { x: l.x, y: l.y, class: "dg-lane-label" }, gL); t.textContent = tx[l.k]; });

      const gE = el("g", { class: "dg-edges" }, svg);
      const edgeEls = Ly.edges.map((e, i) => {
        if (e.k === "ctrl") {
          const m = el("mask", { id: `dgm${i}`, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: Ly.W, height: Ly.H }, defs);
          const mp = el("path", { d: e.d, fill: "none", stroke: "#fff", "stroke-width": 6 }, m);
          const p = el("path", { d: e.d, class: "dg-edge dg-edge--ctrl", mask: `url(#dgm${i})` }, gE);
          if (vertical) p.style.strokeDasharray = "none";
          return { el: p, draw: mp, from: e.from, k: e.k };
        }
        const p = el("path", { d: e.d, class: "dg-edge" }, gE);
        return { el: p, draw: p, from: e.from, k: e.k };
      });
      const loop = el("path", { d: Ly.loop, class: "dg-edge dg-edge--loop" }, gE);
      const loopT = el("text", { x: Ly.loopLabel.x, y: Ly.loopLabel.y, class: "dg-lane-label", "text-anchor": Ly.loopLabel.anchor }, gE);
      if (Ly.loopLabel.wrap) {
        const words = ("↺ " + tx.loop).split(" ");
        const mid = Math.ceil(words.length / 2);
        [words.slice(0, mid).join(" "), words.slice(mid).join(" ")].forEach((line, i) => {
          const ts = el("tspan", { x: Ly.loopLabel.x, dy: i ? 16 : 0 }, loopT);
          ts.textContent = line;
        });
      } else loopT.textContent = "↺  " + tx.loop;
      const spine = el("path", { d: Ly.spine, fill: "none", stroke: "none" }, gE);

      const gP = el("g", { class: "dg-pulses" }, svg);
      const gN = el("g", { class: "dg-nodes" }, svg);
      const nodeEls = {};
      ORDER.forEach((id) => {
        const n = Ly.nodes[id], d = tx[id];
        const g = el("g", { class: `dg-node dg-node--${n.kind}`, "data-node": id, tabindex: 0, role: "button", transform: `translate(${n.x} ${n.y})` }, gN);
        g.setAttribute("aria-label", `${d[0]} — ${d[1]}`);
        const inner = el("g", { "data-motion": "node" }, g);
        el("rect", { class: "body", width: n.w, height: n.h, rx: 12 }, inner);
        const small = vertical && n.kind === "ctrl";
        const nT = el("text", { class: "n", x: 14, y: small ? 22 : 26 }, inner); nT.textContent = n.n;
        el("circle", { class: "dot", cx: n.w - 16, cy: small ? 18 : 22, r: 3 }, inner);
        const tT = el("text", { class: "t", x: 14, y: small ? 44 : (n.kind === "ctrl" ? 52 : (vertical ? 54 : 62)) }, inner);
        tT.textContent = small ? d[3] : d[0];
        if (small) tT.style.fontSize = "13px";
        if (!small) { const sT = el("text", { class: "s", x: 14, y: n.kind === "ctrl" ? 68 : (vertical ? 74 : 86) }, inner); sT.textContent = d[1]; }
        nodeEls[id] = g;
        g.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") setActive(id, "hover"); });
        g.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setActive(null, "hover"); });
        g.addEventListener("focus", () => setActive(id, "hover"));
        g.addEventListener("blur", () => setActive(null, "hover"));
        g.addEventListener("click", () => { pinned = pinned === id ? null : id; setActive(pinned, "pin"); });
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.dispatchEvent(new Event("click")); } });
      });

      // pulses
      const mk = (path, n, speed, cls, r, alpha = 1) => {
        const len = path.getTotalLength();
        for (let i = 0; i < n; i++) pulses.push({ path, len, speed, alpha, off: i / n, el: el("circle", { r, class: cls, style: "opacity:0" }, gP) });
      };
      pulses = [];
      mk(spine, 3, .085, "dg-pulse", 3.2);
      mk(loop, 1, .05, "dg-pulse", 2.6);
      edgeEls.filter((e) => e.k === "ctrl").forEach((e) => mk(e.el, 1, .14 + Math.random() * .05, "dg-pulse dg-pulse--ctrl", 1.8, .8));

      // build timeline
      const lanesEls = [gL];
      const drawables = [...edgeEls.map((e) => e.draw), loop];
      drawables.forEach((p) => { const l = Math.ceil(p.getTotalLength()) + 4; p.style.strokeDasharray = `${l} ${l}`; p.style.strokeDashoffset = `${l}`; });
      const inner = (id) => $("[data-motion='node']", nodeEls[id]);

      const stagePos = {};
      FLOW.forEach((id, i) => (stagePos[id] = .08 + i * .12));
      CTRL.forEach((id, i) => (stagePos[id] = .64 + i * .05));
      const showAll = () => {
        G.set(lanesEls, { autoAlpha: 1 });
        G.set(ORDER.map(inner), { autoAlpha: 1, y: 0, scale: 1 });
        drawables.forEach((p) => (p.style.strokeDashoffset = "0"));
        G.set(loopT, { autoAlpha: 1 });
      };

      if (reduce) { showAll(); setScrollActive(null); return; }

      G.set(lanesEls, { autoAlpha: 0 });
      G.set(loopT, { autoAlpha: 0 });
      G.set(ORDER.map(inner), { autoAlpha: 0, y: 14, scale: .94, transformOrigin: "50% 50%" });

      tl = G.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: host, start: () => `top ${barH()}px`, end: "bottom bottom", scrub: ST.isTouch ? true : .5, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            if (out.track) out.track.style.transform = `scaleX(${p.toFixed(4)})`;
            let cur = null, idx = 0;
            ORDER.forEach((id, i) => { if (p >= stagePos[id] + .02) { cur = id; idx = i + 1; } });
            if (out.count) out.count.textContent = String(idx).padStart(2, "0");
            setScrollActive(cur);
            const shouldLive = p > .93;
            if (shouldLive !== live) { live = shouldLive; if (live) loopPulses(); }
          }
        }
      });
      tl.to(lanesEls, { autoAlpha: 1, duration: .06 }, 0);
      FLOW.forEach((id, i) => {
        tl.to(inner(id), { autoAlpha: 1, y: 0, scale: 1, duration: .06, ease: "power2.out" }, stagePos[id]);
        if (i < 4) tl.to(edgeEls[i].draw, { strokeDashoffset: 0, duration: .06 }, stagePos[id] + .05);
      });
      CTRL.forEach((id) => tl.to(inner(id), { autoAlpha: 1, y: 0, scale: 1, duration: .05, ease: "power2.out" }, stagePos[id]));
      edgeEls.filter((e) => e.k === "ctrl").forEach((e, i) => tl.to(e.draw, { strokeDashoffset: 0, duration: .08 }, .68 + i * .025));
      tl.to(loop, { strokeDashoffset: 0, duration: .1 }, .84);
      tl.to(loopT, { autoAlpha: 1, duration: .05 }, .88);
      tl.to({}, { duration: .06 }, .94);
      ST.refresh();
    }

    function loopPulses() {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const step = (now) => {
        const t = (now - t0) / 1000;
        pulses.forEach((p) => {
          const u = (t * p.speed + p.off) % 1;
          const pt = p.path.getPointAtLength(u * p.len);
          p.el.setAttribute("cx", pt.x.toFixed(1));
          p.el.setAttribute("cy", pt.y.toFixed(1));
          const fade = Math.min(1, u * 8, (1 - u) * 8);
          p.el.style.opacity = (live ? fade * p.alpha : 0).toFixed(2);
        });
        if (live) raf = requestAnimationFrame(step);
        else pulses.forEach((p) => (p.el.style.opacity = "0"));
      };
      raf = requestAnimationFrame(step);
    }

    function setScrollActive(id) {
      scrollActive = id;
      if (!pinned && !active) paint(id, false);
    }
    function setActive(id, why) {
      if (why === "hover") active = id;
      paint(active || pinned || scrollActive, !!(active || pinned));
    }
    function paint(id, focused) {
      const tx = L();
      $$(".dg-node", svg).forEach((n) => n.classList.toggle("is-active", n.dataset.node === id));
      svg.classList.toggle("has-focus", focused && !!id);
      if (out.hint) out.hint.textContent = finePointer ? tx.hover : tx.tap;
      if (!id) {
        if (out.k) out.k.textContent = "00 · " + tx.flow;
        if (out.t) out.t.textContent = tx.intro;
        if (out.s) out.s.textContent = "";
        if (out.d) out.d.textContent = tx.introD;
        return;
      }
      const d = tx[id], isCtrl = id[0] === "c";
      const num = isCtrl ? `G${id[1]}` : `0${id[1]}`;
      if (out.k) out.k.textContent = `${num} · ${isCtrl ? tx.laneC : tx.laneF}`;
      if (out.t) out.t.textContent = d[0];
      if (out.s) out.s.textContent = d[1];
      if (out.d) out.d.textContent = d[2];
    }

    let lastV = null;
    const onResize = () => {
      const r = stage.getBoundingClientRect();
      const v = r.width < 720 || r.width / Math.max(1, r.height) < 1.05;
      if (v !== lastV) { lastV = v; render(); }
    };
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(onResize, 180); });
    if (out.count) {
      const tot = $("[data-dg-total]", host);
      if (tot) tot.textContent = String(ORDER.length).padStart(2, "0");
    }
    lastV = null; onResize();
    return { render: () => { render(); paint(active || pinned || scrollActive, false); } };
  })();

  /* ---------------- About: pick dawn / zenith / dusk ---------------- */
  (function initDirection() {
    const host = $("[data-dir]");
    if (!host) return;
    const cv = $('[data-scene="dir"]', host);
    const scene = cv && cv._scene;
    const cols = $$(".dir__col", host);
    const clock = $("[data-dir-clock]", host), phase = $("[data-dir-phase]", host), bar = $("[data-dir-progress]", host);
    const S = scene ? scene.state : { p: 0 };
    let active = 0, tween = null;

    const hud = () => {
      const hrs = 6 + S.p * 12, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60);
      if (clock) clock.textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      if (bar) bar.style.transform = `scaleX(${S.p.toFixed(4)})`;
      if (reduce && scene) scene.redraw();
    };
    const label = (i) => {
      const k = $(".dir__k span", cols[i]);
      if (phase && k) phase.textContent = k.textContent.replace(/^\s*\d\d:\d\d\s*·\s*/, "");
    };
    const select = (i, focus) => {
      active = i;
      cols.forEach((c, k) => {
        const on = k === i;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", String(on));
        c.tabIndex = on ? 0 : -1;
      });
      if (focus) cols[i].focus({ preventScroll: true });
      label(i);
      const target = parseFloat(cols[i].dataset.p);
      if (tween) tween.kill();
      if (reduce) { S.p = target; hud(); return; }
      tween = G.to(S, { p: target, duration: 2.4, ease: "power2.inOut", onUpdate: hud });
    };

    cols.forEach((c, i) => {
      c.addEventListener("click", () => select(i));
      c.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select((active + 1) % cols.length, true); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select((active + cols.length - 1) % cols.length, true); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); }
      });
    });
    document.addEventListener("langchange", () => label(active));

    // first time the scene comes into view: the sun rises to "dawn"
    S.p = 0; hud();
    cols.forEach((c, k) => c.classList.toggle("is-active", k === 0));
    label(0);
    ST.create({ trigger: host, start: "top 75%", once: true, onEnter: () => select(0) });
  })();

  /* ---------------- Hero clock ---------------- */
  initClock();
  function initClock() {
    const c = document.querySelector("[data-clock]");
    if (!c) return;
    const fmt = () => {
      try {
        c.textContent = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
      } catch (e) { c.textContent = new Date().toTimeString().slice(0, 8); }
    };
    fmt(); setInterval(fmt, 1000);
  }

  /* ---------------- Services page: sticky sub-nav ---------------- */
  (function initSvcNav() {
    const links = $$(".svc__nav a");
    if (!links.length) return;
    links.forEach((a) => {
      const id = a.getAttribute("href").split("#")[1];
      const sec = document.getElementById(id);
      if (!sec) return;
      ST.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: (self) => {
          if (!self.isActive) return;
          links.forEach((l) => l.classList.toggle("is-active", l === a));
          const ul = a.parentElement.parentElement;
          ul.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
        }
      });
    });
  })();

  /* ---------------- Contact: process timeline ---------------- */
  (function initTimeline() {
    const tlw = $("[data-timeline]");
    if (!tlw) return;
    const items = $$(".tl", tlw);
    const line = $(".timeline__line i", tlw);
    if (reduce) { items.forEach((i) => i.classList.add("is-on")); if (line) line.style.transform = "scaleX(1)"; return; }
    G.set(items, { autoAlpha: 0, y: 24 });
    ST.batch(items, { start: "top 90%", once: true, onEnter: (b) => G.to(b, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: .08 }) });
    ST.create({
      trigger: tlw, start: "top 75%", end: "bottom 45%", scrub: .5,
      onUpdate: (self) => {
        const p = self.progress;
        if (line) line.style.transform = `scaleX(${p.toFixed(4)})`;
        items.forEach((it, i) => it.classList.toggle("is-on", p >= i / items.length - .001 && p > 0));
      }
    });
  })();

  /* ---------------- Contact form ---------------- */
  initForm();
  function initForm() {
    const form = document.querySelector("[data-form]");
    if (!form) return;
    const status = form.querySelector("[data-status]");
    const fields = Array.from(form.querySelectorAll(".field input, .field textarea, .field select"));
    const sync = (f) => f.closest(".field").classList.toggle("is-filled", !!f.value);
    fields.forEach((f) => {
      sync(f);
      f.addEventListener("input", () => { sync(f); clearErr(f); });
      f.addEventListener("change", () => { sync(f); clearErr(f); });
      f.addEventListener("blur", () => sync(f));
    });
    const consent = form.querySelector("[name=kvkk]");
    if (consent) consent.addEventListener("change", () => consent.closest(".consent").classList.remove("is-invalid"));
    function clearErr(f) { const w = f.closest(".field"); w.classList.remove("is-invalid"); const e = w.querySelector(".field__err"); if (e) e.textContent = ""; }
    function err(f, key, fb) { const w = f.closest(".field"); w.classList.add("is-invalid"); const e = w.querySelector(".field__err"); if (e) e.textContent = T(key, fb); }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form__status"; status.textContent = "";
      if (form.querySelector("[name=website]").value) return; // honeypot
      let ok = true, first = null;
      const need = (name, key, fb, test) => {
        const f = form.querySelector(`[name=${name}]`);
        if (!f) return;
        const v = f.value.trim();
        if (!v || (test && !test(v))) { err(f, key, fb); ok = false; first = first || f; }
      };
      need("name", "form.err.name", "Lütfen adınızı yazın.");
      need("email", "form.err.email", "Geçerli bir e-posta adresi yazın.", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
      need("message", "form.err.msg", "Kısaca ihtiyacınızı anlatın.");
      if (consent && !consent.checked) { consent.closest(".consent").classList.add("is-invalid"); ok = false; first = first || consent; }
      if (!ok) {
        status.classList.add("is-err"); status.textContent = T("form.err.all", "Lütfen işaretli alanları kontrol edin.");
        if (first) first.focus({ preventScroll: true });
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.website;
      const btn = form.querySelector("[type=submit]");
      const S = window.SITE || {};
      if (S.formEndpoint) {
        btn.disabled = true;
        try {
          const res = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(String(res.status));
          form.reset(); fields.forEach(sync);
          status.classList.add("is-ok"); status.textContent = T("form.ok", "Teşekkürler! Proje özetiniz bize ulaştı; en kısa sürede dönüş yapacağız.");
        } catch (x) {
          status.classList.add("is-err"); status.textContent = T("form.fail", "Gönderim sırasında bir sorun oluştu. Lütfen e-posta ile yazın: ") + (S.email || "");
        } finally { btn.disabled = false; }
      } else {
        const lines = [
          `${T("form.name", "Ad Soyad")}: ${data.name || ""}`,
          `${T("form.email", "E-posta")}: ${data.email || ""}`,
          `${T("form.phone", "Telefon")}: ${data.phone || ""}`,
          `${T("form.company", "Şirket")}: ${data.company || ""}`,
          `${T("form.service", "Hizmet alanı")}: ${data.service || ""}`,
          `${T("form.stage", "Şirketin aşaması")}: ${data.stage || ""}`,
          "", data.message || ""
        ];
        const subject = `${T("form.subject", "Proje özeti")} — ${data.company || data.name || ""}`;
        location.href = `mailto:${S.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
        status.classList.add("is-ok"); status.textContent = T("form.mail", "E-posta uygulamanız açılıyor. Mesajı göndererek talebinizi iletebilirsiniz.");
      }
    });
  }

  /* ---------------- Back to top ---------------- */
  $$("[data-top]").forEach((b) => b.addEventListener("click", () => scrollTo(0, 0)));

  /* ---------------- Language change → refresh motion ---------------- */
  document.addEventListener("langchange", () => {
    $$("[data-scramble]").forEach((el) => cancelAnimationFrame(el._scr || 0));
    initInk();
    $$("[data-marquee]").forEach((m) => m._langRefresh && m._langRefresh());
    Sound.setLabel();
    if (Diagram) Diagram.render();
    ST.refresh();
  });

  /* ---------------- Boot ---------------- */
  initReveals();
  initInk();
  // Respect an incoming hash (e.g. hizmetler.html#finans) after layout settles
  if (location.hash) {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) setTimeout(() => scrollTo(t, -(barH() + stickyExtra(t) + 12)), 700);
  }
  window.addEventListener("load", () => ST.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
})();
