/* =========================================================
   Shared layout: header, menus, curtain, CTA band, footer.
   Edit company/contact details ONLY in SITE below.
   ========================================================= */
window.SITE = {
  brand: "Yeşil Ufuk",
  legalName: "YEŞİL UFUK TURİZM İNŞAAT PROJE ANONİM ŞİRKETİ",
  addressLines: [
    "Ataköy 7-8-9-10. Kısım Mah. Çobançeşme E-5 Yan Yol Cad.",
    "Ataköy Towers A Blok No: 20/1, İç Kapı No: 70, Bakırköy / İstanbul"
  ],
  // TODO: replace with the real e-mail and phone before going live.
  email: "info@yesilufuk.com.tr",
  phone: "+90 501 535 53 06",
  linkedin: "",         // e.g. "https://www.linkedin.com/company/..." — leave empty to hide
  // Optional: a form backend (e.g. Formspree "https://formspree.io/f/xxxx").
  // When empty, the contact form opens the visitor's mail app with the brief filled in.
  formEndpoint: "",
  mapQuery: "Ataköy Towers, Bakırköy, İstanbul"
};

(function () {
  const S = window.SITE;
  const page = document.body.dataset.page || "";
  const cur = (p) => (page === p ? ' aria-current="page"' : "");

  const mark = (cls) => `
    <svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">
      <defs><clipPath id="hz-${cls}"><rect x="0" y="0" width="32" height="21"/></clipPath></defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="currentColor" stroke-opacity=".35"/>
      <g clip-path="url(#hz-${cls})"><circle class="sun" cx="16" cy="20" r="7" fill="#8fe3a8"/></g>
      <line x1="5" y1="21" x2="27" y2="21" stroke="currentColor" stroke-width="1.4"/>
      <line x1="9" y1="25" x2="23" y2="25" stroke="currentColor" stroke-opacity=".5"/>
    </svg>`;

  const services = [
    { id: "kurulus", n: "01" },
    { id: "strateji", n: "02" },
    { id: "operasyon", n: "03" },
    { id: "finans", n: "04" }
  ];
  const svcTitles = {
    kurulus: "Şirket Kuruluşu &amp; Organizasyon",
    strateji: "Stratejik Yönetim",
    operasyon: "Operasyon &amp; Süreç Yönetimi",
    finans: "Finansal Yönetim Danışmanlığı"
  };
  const svcDesc = {
    kurulus: "Doğru şirket türü ve net bir kuruluş planı.",
    strateji: "İş planı, fizibilite ve büyüme yol haritası.",
    operasyon: "Roller, iş akışları ve performans göstergeleri.",
    finans: "Bütçe, maliyet analizi ve yönetim raporlaması."
  };

  const langBtns = `
    <div class="lang" role="group" aria-label="Dil / Language">
      <button type="button" data-lang="tr" aria-pressed="true">TR</button>
      <button type="button" data-lang="en" aria-pressed="false">EN</button>
    </div>`;

  const header = `
  <a class="skip" href="#main" data-i18n="nav.skip">İçeriğe geç</a>
  <header class="hdr" data-hdr>
    <div class="hdr__in">
      <a class="logo" href="index.html" aria-label="${S.brand}">
        ${mark("logo__mark")}
        <span class="logo__txt"><span class="logo__word">${S.brand}</span><span class="logo__sub mono" data-i18n="brand.sub">Danışmanlık</span></span>
      </a>
      <nav class="nav" aria-label="Ana menü">
        <div class="nav__item" data-mega-root>
          <button class="nav__link" type="button" aria-expanded="false" aria-controls="mega" data-mega-btn${page === "services" ? ' aria-current="page"' : ""}>
            <span data-i18n="nav.services">Hizmetler</span>
            <svg class="chev" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 2.5l3 3 3-3" fill="none" stroke="currentColor"/></svg>
          </button>
          <div class="mega" id="mega" data-mega>
            <div class="mega__head mono"><span data-i18n="mega.label">Hizmet Alanları</span><span>04</span></div>
            ${services.map((s) => `
              <a class="mega__a" href="hizmetler.html#${s.id}" data-sound>
                <span class="n mono">${s.n}</span>
                <span><b data-i18n="s.${s.id}.t">${svcTitles[s.id]}</b><span class="d" data-i18n="s.${s.id}.short">${svcDesc[s.id]}</span></span>
                <span class="go" aria-hidden="true">→</span>
              </a>`).join("")}
            <div class="mega__foot"><a class="link-arrow" href="hizmetler.html"><span data-i18n="mega.all">Tüm hizmetler</span> <i>→</i></a></div>
          </div>
        </div>
        <a class="nav__link" href="hakkimizda.html"${cur("about")} data-sound data-i18n="nav.about">Hakkımızda</a>
        <a class="nav__link" href="iletisim.html#surec" data-sound data-i18n="nav.process">Süreç</a>
        <a class="nav__link" href="iletisim.html"${cur("contact")} data-sound data-i18n="nav.contact">İletişim</a>
      </nav>
      <div class="hdr__tools">
        ${langBtns}
        <button class="sound" type="button" aria-pressed="false" data-sound-toggle>
          <span class="sound__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="mono" data-sound-label>Ses Kapalı</span>
        </button>
        <a class="btn btn--sm" href="iletisim.html" data-magnetic data-sound><span class="btn__label" data-i18n="nav.cta">Proje Başlat</span><span class="arr" aria-hidden="true"></span></a>
        <button class="burger" type="button" aria-expanded="false" aria-controls="mnav" data-burger><span class="sr-only" data-i18n="nav.menu">Menü</span><i></i><i></i></button>
      </div>
    </div>
    <div class="progress" aria-hidden="true"><i data-progress></i></div>
  </header>

  <div class="mnav" id="mnav" data-mnav aria-hidden="true">
    <ul class="mnav__list">
      <li><a href="index.html"><span class="n mono">00</span><span data-i18n="nav.home">Ana Sayfa</span></a></li>
      <li><a href="hizmetler.html"><span class="n mono">01</span><span data-i18n="nav.services">Hizmetler</span></a></li>
      <li><a href="hakkimizda.html"><span class="n mono">02</span><span data-i18n="nav.about">Hakkımızda</span></a></li>
      <li><a href="iletisim.html#surec"><span class="n mono">03</span><span data-i18n="nav.process">Süreç</span></a></li>
      <li><a href="iletisim.html"><span class="n mono">04</span><span data-i18n="nav.contact">İletişim</span></a></li>
    </ul>
    <div class="mnav__foot">
      ${langBtns}
      <a class="mono nocase" href="mailto:${S.email}">${S.email}</a>
      ${S.phone ? `<a class="mono" href="tel:${S.phone.replace(/\s/g, "")}">${S.phone}</a>` : ""}
      <span class="mono">Bakırköy / İstanbul, <span data-i18n="addr.country">Türkiye</span></span>
    </div>
  </div>

  <div class="curtain" data-curtain aria-hidden="true">
    <div class="curtain__in">
      ${mark("curtain__mark")}
      <div class="curtain__bar"><i></i></div>
      <span class="curtain__label mono" data-curtain-label>${S.brand}</span>
    </div>
  </div>
  <div class="grain" aria-hidden="true"></div>
  <div class="cursor" aria-hidden="true" data-cursor></div>`;

  const cta = `
  <section class="cta" aria-labelledby="cta-h">
    <div class="cta__glow" aria-hidden="true"></div>
    <div class="wrap">
      <span class="eyebrow mono" data-scramble data-i18n="cta.eyebrow">Sonraki adım</span>
      <h2 class="h2 split" id="cta-h" style="margin-top:28px">
        <span class="ln"><span data-i18n="cta.l1">Karmaşayı bize bırakın.</span></span>
        <span class="ln"><span class="accent" data-i18n="cta.l2">Birlikte kuralım.</span></span>
      </h2>
      <div class="cta__row">
        <p class="lead" data-reveal data-i18n="cta.lead">Şirketinizi ve hedefinizi kısaca anlatın; size en uygun yol haritasıyla dönüş yapalım.</p>
        <a class="btn btn--xl" href="iletisim.html" data-magnetic data-sound data-reveal><span class="btn__label" data-i18n="cta.btn">Görüşme planla</span><span class="arr" aria-hidden="true"></span></a>
      </div>
    </div>
    <div class="cta__horizon" aria-hidden="true"></div>
  </section>`;

  const year = new Date().getFullYear();
  const footer = `
  <footer class="ftr">
    <div class="wrap">
      <div class="ftr__grid">
        <div>
          <h4 class="mono"><span>01 /</span> <span data-i18n="nav.services">Hizmetler</span></h4>
          <ul>${services.map((s) => `<li><a class="fl" href="hizmetler.html#${s.id}" data-i18n="s.${s.id}.t">${svcTitles[s.id]}</a></li>`).join("")}</ul>
        </div>
        <div>
          <h4 class="mono"><span>02 /</span> <span data-i18n="ftr.company">Şirket</span></h4>
          <ul>
            <li><a class="fl" href="hakkimizda.html" data-i18n="nav.about">Hakkımızda</a></li>
            <li><a class="fl" href="iletisim.html#surec" data-i18n="nav.process">Süreç</a></li>
            <li><a class="fl" href="iletisim.html" data-i18n="nav.contact">İletişim</a></li>
            <li><a class="fl" href="kvkk.html" data-i18n="ftr.kvkk">KVKK Aydınlatma Metni</a></li>
            ${S.linkedin ? `<li><a class="fl" href="${S.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a></li>` : ""}
          </ul>
        </div>
        <div>
          <h4 class="mono"><span>03 /</span> <span data-i18n="nav.contact">İletişim</span></h4>
          <address>${S.addressLines.join("<br>")}, <span data-i18n="addr.country">Türkiye</span></address>
          <ul style="margin-top:16px">
            <li><a class="fl" href="mailto:${S.email}">${S.email}</a></li>
            ${S.phone ? `<li><a class="fl" href="tel:${S.phone.replace(/\s/g, "")}">${S.phone}</a></li>` : ""}
          </ul>
        </div>
        <div>
          <h4 class="mono"><span>04 /</span> ${S.brand}</h4>
          <p class="ftr__tag" data-i18n="ftr.tag">Ufku netleştirenler.</p>
          <p class="ftr__blurb" data-i18n="ftr.blurb">Şirketlere kuruluş, strateji, operasyon ve finans alanlarında uçtan uca danışmanlık sunan İstanbul merkezli bir işletme danışmanlığı firması.</p>
        </div>
      </div>
      <div class="ftr__word" aria-hidden="true" data-ftr-word>${[..."Yeşil Ufuk"].map((c) => `<span>${c === " " ? "&nbsp;" : c}</span>`).join("")}</div>
      <div class="ftr__bottom mono">
        <div class="ftr__legal">
          <p>© ${year} ${S.legalName}</p>
        </div>
        <button type="button" data-top><span data-i18n="ftr.top">Başa dön</span> ↑</button>
      </div>
    </div>
  </footer>`;

  const h = document.getElementById("site-header");
  if (h) h.outerHTML = header;
  const f = document.getElementById("site-footer");
  if (f) f.outerHTML = (document.body.dataset.cta === "off" ? "" : cta) + footer;

  // Contact details on the page body (contact page) come from SITE too
  document.querySelectorAll("[data-site-email]").forEach((a) => { a.href = `mailto:${S.email}`; a.textContent = S.email; });
  document.querySelectorAll("[data-site-address]").forEach((a) => { a.innerHTML = S.addressLines.join("<br>") + ', <span data-i18n="addr.country">Türkiye</span>'; });
  if (S.phone) {
    document.querySelectorAll("[data-site-phone-wrap]").forEach((w) => { w.hidden = false; });
    document.querySelectorAll("[data-site-phone]").forEach((a) => { a.href = `tel:${S.phone.replace(/\s/g, "")}`; a.textContent = S.phone; });
  }
  const q = encodeURIComponent(S.mapQuery);
  document.querySelectorAll("[data-site-map]").forEach((m) => { const u = `https://maps.google.com/maps?q=${q}&z=15&output=embed`; if (m.getAttribute("src") !== u) m.src = u; });
  document.querySelectorAll("[data-site-maplink]").forEach((m) => { m.href = `https://www.google.com/maps/search/?api=1&query=${q}`; });
})();
