/* Photo stories: independent of the animation libraries, with explicit playback control. */
(function () {
  "use strict";
  const host = document.querySelector("[data-tour]");
  if (!host) return;
  const tabs = Array.from(host.querySelectorAll(".tour__tab"));
  const slides = Array.from(host.querySelectorAll(".tour__slide"));
  const bars = Array.from(host.querySelectorAll(".tour__bars b"));
  const panel = host.querySelector(".tour__panel");
  const toggle = host.querySelector("[data-tour-toggle]");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 7000;
  let current = 0, elapsed = 0, last = 0, raf = 0;
  let playing = !motion.matches, visible = false, hovering = false, focused = false;
  let textAnimation;

  function render() {
    const tab = tabs[current];
    panel.setAttribute("aria-labelledby", tab.id);
    panel.querySelector("[data-tour-k]").textContent = `${String(current + 1).padStart(2, "0")} / ${String(tabs.length).padStart(2, "0")}`;
    panel.querySelector("[data-tour-t]").textContent = tab.querySelector("b").textContent;
    panel.querySelector("[data-tour-d]").textContent = tab.querySelector(".tour__src").textContent;
    const link = panel.querySelector("[data-tour-link]");
    if (link && tab.dataset.href) link.href = tab.dataset.href;
    const label = window.I18N ? window.I18N.t(playing ? "tour.pause" : "tour.play") : (playing ? "Slaytı duraklat" : "Slaytı oynat");
    toggle.querySelector("span").textContent = label;
    toggle.setAttribute("aria-label", label);
    toggle.classList.toggle("is-paused", !playing);
    panel.setAttribute("aria-live", playing ? "off" : "polite");
  }

  function sync() {
    cancelAnimationFrame(raf);
    last = 0;
    const running = playing && visible && !document.hidden && !hovering && !focused && !motion.matches;
    host.classList.toggle("is-playing", running);
    if (running) raf = requestAnimationFrame(tick);
  }

  function select(index, manual) {
    current = (index + tabs.length) % tabs.length;
    elapsed = 0;
    if (manual) playing = false;
    tabs.forEach((tab, i) => {
      const active = i === current;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      slides[i].classList.toggle("is-active", active);
      slides[i].setAttribute("aria-hidden", String(!active));
      bars[i].style.transform = `scaleX(${i < current || (i === current && !playing) ? 1 : 0})`;
    });
    if (textAnimation) textAnimation.cancel();
    render();
    if (!motion.matches && panel.animate) textAnimation = panel.animate([{ opacity: .35, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
    sync();
  }

  function tick(now) {
    if (last) elapsed += Math.min(now - last, 100);
    last = now;
    bars[current].style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
    if (elapsed >= duration) { select(current + 1, false); return; }
    raf = requestAnimationFrame(tick);
  }

  tabs.forEach((tab, i) => {
    tab.id = `tour-tab-${i}`;
    tab.setAttribute("aria-controls", "tour-panel");
    tab.addEventListener("click", () => select(i, true));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = current + 1;
      if (event.key === "ArrowLeft") next = current - 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next == null) return;
      event.preventDefault();
      select(next, true);
      tabs[current].focus({ preventScroll: true });
    });
  });
  toggle.addEventListener("click", () => {
    playing = !playing;
    if (playing) { elapsed = 0; bars[current].style.transform = "scaleX(0)"; }
    render(); sync();
  });
  host.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") { hovering = true; sync(); } });
  host.addEventListener("pointerleave", () => { hovering = false; sync(); });
  // Pause while a keyboard user is inside the slider, but not after a mouse click
  // and not on the play/pause button itself (otherwise "Play" would do nothing).
  const holdsFocus = (el) => !!el && el !== toggle && host.contains(el) && el.matches(":focus-visible");
  host.addEventListener("focusin", (event) => { focused = holdsFocus(event.target); sync(); });
  host.addEventListener("focusout", (event) => { focused = holdsFocus(event.relatedTarget); sync(); });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("langchange", render);
  motion.addEventListener("change", () => { if (motion.matches) playing = false; render(); sync(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 }).observe(host);
  select(0, false);
})();
