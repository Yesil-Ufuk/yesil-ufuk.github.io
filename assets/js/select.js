/* =========================================================
   Custom dropdown — progressive enhancement of <select>.
   The native select stays in the form (hidden) and keeps
   the value; this renders an accessible listbox on top.
   ========================================================= */
(function () {
  const selects = Array.from(document.querySelectorAll(".field--select select"));
  if (!selects.length) return;

  const chev = '<svg class="dd__chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  const check = '<svg class="dd__check" viewBox="0 0 16 16" aria-hidden="true"><polyline points="3,8.5 6.5,12 13,4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  let openDD = null;

  selects.forEach((sel, idx) => {
    const field = sel.closest(".field");
    const label = field.querySelector("label");
    const uid = sel.id || `dd${idx}`;

    sel.classList.add("dd-native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    field.classList.add("has-dd");

    const wrap = document.createElement("div");
    wrap.className = "dd";
    wrap.innerHTML = `
      <button type="button" class="dd__btn" id="${uid}-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${uid}-list">
        <span class="dd__val"></span>${chev}
      </button>
      <ul class="dd__panel" id="${uid}-list" role="listbox" tabindex="-1" data-lenis-prevent></ul>`;
    sel.insertAdjacentElement("afterend", wrap);

    const btn = wrap.querySelector(".dd__btn");
    const val = wrap.querySelector(".dd__val");
    val.id = `${uid}-value`;
    const list = wrap.querySelector(".dd__panel");
    if (label) {
      label.id = label.id || `${uid}-label`;
      label.htmlFor = btn.id;
      btn.setAttribute("aria-labelledby", `${label.id} ${val.id}`);
      list.setAttribute("aria-labelledby", label.id);
    }

    let opts = [], active = -1, typed = "", typedT = 0;

    function build() {
      const real = Array.from(sel.options);
      const placeholder = real.find((o) => o.value === "");
      opts = real.filter((o) => o.value !== "" || o !== placeholder);
      list.innerHTML = opts.map((o, i) => `
        <li class="dd__opt" role="option" id="${uid}-o${i}" data-i="${i}" style="--i:${i}" aria-selected="${o.selected && o !== placeholder}">
          <span class="n mono">${String(i + 1).padStart(2, "0")}</span>
          <span class="t">${o.textContent}</span>${check}
        </li>`).join("");
      wrap.dataset.placeholder = placeholder ? placeholder.textContent : "";
      render();
    }

    function render() {
      const cur = sel.options[sel.selectedIndex];
      const empty = !cur || cur.value === "" && !opts.includes(cur);
      val.textContent = empty ? (wrap.dataset.placeholder || "—") : cur.textContent;
      val.classList.toggle("is-ph", empty);
      Array.from(list.children).forEach((li, i) => li.setAttribute("aria-selected", String(!empty && opts[i] === cur)));
    }

    function setActive(i) {
      const items = list.children;
      if (!items.length) return;
      active = (i + items.length) % items.length;
      Array.from(items).forEach((li, k) => li.classList.toggle("is-active", k === active));
      list.setAttribute("aria-activedescendant", items[active].id);
      const li = items[active];
      const top = li.offsetTop, bot = top + li.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top - 6;
      else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight + 6;
    }

    function choose(i) {
      const o = opts[i];
      if (!o) return;
      sel.value = o.value || o.textContent;
      o.selected = true;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      render();
      close(true);
    }

    function open() {
      if (openDD && openDD !== api) openDD.close(false);
      const r = wrap.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      wrap.classList.toggle("dd--up", below < 300 && r.top > below);
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      const selIdx = opts.indexOf(sel.options[sel.selectedIndex]);
      setActive(selIdx > -1 ? selIdx : 0);
      list.focus({ preventScroll: true });
      openDD = api;
    }

    function close(focusBtn) {
      if (!wrap.classList.contains("is-open")) return;
      wrap.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      list.removeAttribute("aria-activedescendant");
      if (focusBtn) btn.focus({ preventScroll: true });
      if (openDD === api) openDD = null;
    }

    btn.addEventListener("click", () => (wrap.classList.contains("is-open") ? close(true) : open()));
    btn.addEventListener("keydown", (e) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
    });
    list.addEventListener("pointermove", (e) => {
      const li = e.target.closest(".dd__opt");
      if (li && +li.dataset.i !== active) setActive(+li.dataset.i);
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest(".dd__opt");
      if (li) choose(+li.dataset.i);
    });
    list.addEventListener("keydown", (e) => {
      const n = list.children.length;
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); setActive(active + 1); break;
        case "ArrowUp": e.preventDefault(); setActive(active - 1); break;
        case "Home": e.preventDefault(); setActive(0); break;
        case "End": e.preventDefault(); setActive(n - 1); break;
        case "Enter": case " ": e.preventDefault(); choose(active); break;
        case "Escape": e.preventDefault(); close(true); break;
        case "Tab": close(false); break;
        default:
          if (e.key.length === 1) {
            clearTimeout(typedT);
            typed += e.key.toLocaleLowerCase();
            typedT = setTimeout(() => (typed = ""), 600);
            const hit = opts.findIndex((o) => o.textContent.toLocaleLowerCase().startsWith(typed));
            if (hit > -1) setActive(hit);
          }
      }
    });
    sel.addEventListener("change", render);

    const api = { close, build, render };
    wrap._dd = api;
    build();
  });

  document.addEventListener("pointerdown", (e) => {
    if (openDD && !e.target.closest(".dd.is-open")) openDD.close(false);
  });
  window.addEventListener("resize", () => openDD && openDD.close(false));

  // language switch rewrites the <option>s — rebuild the lists
  document.addEventListener("langchange", () => {
    document.querySelectorAll(".dd").forEach((w) => w._dd && w._dd.build());
  });
  // form.reset() clears the native value — refresh the triggers
  document.querySelectorAll("form").forEach((f) => f.addEventListener("reset", () => {
    setTimeout(() => document.querySelectorAll(".dd").forEach((w) => w._dd && w._dd.render()), 0);
  }));
})();
