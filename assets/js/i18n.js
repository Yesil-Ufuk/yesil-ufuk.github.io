/* =========================================================
   i18n — Turkish lives in the HTML (default, SEO).
   EN / RU are swapped in from the dictionaries below.
   ========================================================= */
window.I18N = (function () {
  const LANGS = ["tr", "en"];
  const KEY = "yu-lang";

  // strings used only from JavaScript (Turkish included)
  const JS = {
    tr: {
      "sound.on": "Ses Açık", "sound.off": "Ses Kapalı",
      "form.err.name": "Lütfen adınızı yazın.",
      "form.err.email": "Geçerli bir e-posta adresi yazın.",
      "form.err.msg": "Kısaca ihtiyacınızı anlatın.",
      "form.err.all": "Lütfen işaretli alanları kontrol edin.",
      "form.ok": "Teşekkürler! Proje özetiniz bize ulaştı; en kısa sürede dönüş yapacağız.",
      "form.fail": "Gönderim sırasında bir sorun oluştu. Lütfen doğrudan e-posta ile yazın: ",
      "form.mail": "E-posta uygulamanız açılıyor. Mesajı göndererek talebinizi iletebilirsiniz.",
      "form.subject": "Proje özeti"
    },
    en: {
      "sound.on": "Sound On", "sound.off": "Sound Off",
      "form.err.name": "Please enter your name.",
      "form.err.email": "Please enter a valid e-mail address.",
      "form.err.msg": "Briefly describe what you need.",
      "form.err.all": "Please check the highlighted fields.",
      "form.ok": "Thank you! Your brief has reached us — we will get back to you shortly.",
      "form.fail": "Something went wrong while sending. Please e-mail us directly: ",
      "form.mail": "Your e-mail app is opening. Send the message to submit your brief.",
      "form.subject": "Project brief"
    }
  };

  const D = {
    en: {
      "meta.home.title": "Yeşil Ufuk | Business &amp; Management Consulting — Istanbul",
      "meta.home.desc": "Yeşil Ufuk is an Istanbul-based business and management consultancy in Bakırköy: company formation, strategic management, operations and financial management advisory.",
      "meta.svc.title": "Services | Yeşil Ufuk Business &amp; Management Consulting",
      "meta.svc.desc": "Yeşil Ufuk services: company formation and organisation, strategic management, operations and process management, financial management advisory. Istanbul.",
      "meta.about.title": "About Us | Yeşil Ufuk Business &amp; Management Consulting",
      "meta.about.desc": "About Yeşil Ufuk: an Istanbul-based business and management consultancy. Our principles, mission, vision and company details.",
      "meta.contact.title": "Contact | Yeşil Ufuk — Ataköy, Bakırköy / Istanbul",
      "meta.contact.desc": "Contact Yeşil Ufuk: Ataköy Towers, Bakırköy / Istanbul. Phone: +90 501 535 53 06. Tell us about your project and we will get back to you.",
      "meta.kvkk.title": "Privacy Notice (KVKK) | Yeşil Ufuk",

      "brand.sub": "Consulting",
      "nav.skip": "Skip to content", "nav.home": "Home", "nav.services": "Services", "nav.about": "About",
      "nav.process": "Process", "nav.contact": "Contact", "nav.cta": "Start Project", "nav.menu": "Menu",
      "mega.label": "Capabilities", "mega.all": "All services",

      "s.kurulus.t": "Company Formation &amp; Organisation",
      "s.strateji.t": "Strategic Management",
      "s.operasyon.t": "Operations &amp; Process Management",
      "s.finans.t": "Financial Management Advisory",
      "s.kurulus.short": "The right company type and a clear setup plan.",
      "s.strateji.short": "Business plan, feasibility and growth roadmap.",
      "s.operasyon.short": "Roles, workflows and performance indicators.",
      "s.finans.short": "Budget, cost analysis and management reporting.",
      "s.kurulus.d": "The right company type, a clear setup plan and orderly management from day one.",
      "s.strateji.d": "With a business plan, feasibility study and growth strategy we turn goals into an actionable roadmap.",
      "s.operasyon.d": "We make the business scalable by clarifying roles, workflows and performance indicators.",
      "s.finans.d": "Budgets, cost analysis and management reporting move decisions from gut feeling to data.",
      "s.kurulus.tags": "<li>Ltd. / JSC</li><li>Articles of Association</li><li>Setup Plan</li><li>Internal Regulations</li>",
      "s.strateji.tags": "<li>Business Plan</li><li>Feasibility</li><li>Market Entry</li><li>KPI / OKR</li>",
      "s.operasyon.tags": "<li>Organisation</li><li>SOP</li><li>Process Design</li><li>Digitalisation</li>",
      "s.finans.tags": "<li>Budget</li><li>Cost Analysis</li><li>Management Report</li><li>KPI Dashboard</li>",
      "s.kurulus.long": "Limited or joint-stock company: together we choose the company type that best fits your activity and growth plan, and we plan the formation process and the first management set-up from start to finish.",
      "s.strateji.long": "We clarify where you want to go and plan the route there in numbers. Strategy does not stay on the shelf: every goal is tied to an owner, a timeline and an indicator.",
      "s.operasyon.long": "We turn a founder-dependent, people-driven operation into a system that runs on defined roles, standard processes and measurable performance.",
      "s.finans.long": "We turn your existing numbers into information that management can use: budget, cost and profitability visibility for faster, sounder decisions.",
      "s.kurulus.list": "<li>Choosing the company type that fits the activity</li><li>Coordinating the preparation of articles of association and formation documents</li><li>Following up trade registry, tax and social-security registrations</li><li>Setting up the initial organisation and task allocation</li><li>Drafting internal regulations and core company policies</li><li>A roadmap for the first 90 days after formation</li>",
      "s.strateji.list": "<li>Business plans and feasibility studies</li><li>Market and competitor analysis</li><li>Market-entry and growth strategy</li><li>Building the goal and KPI / OKR set</li><li>Management presentations and decision documents</li><li>Tracking the execution of the strategic plan</li>",
      "s.operasyon.list": "<li>Org chart and job descriptions</li><li>Authority and approval matrix</li><li>Process mapping and improvement</li><li>Standard operating procedures (SOP)</li><li>Software and digital tool selection</li><li>Performance management system</li>",
      "s.finans.list": "<li>Budget planning and tracking</li><li>Income–expense planning</li><li>Cost and profitability analysis</li><li>Management reporting and dashboards</li><li>Pricing and cost models</li><li>Budget-vs-actual variance analysis</li>",

      "home.eyebrow": "Business &amp; Management Consulting",
      "home.h1a": "We Clarify", "home.h1b": "The Horizon.",
      "home.lead": "Business and management consulting. From formation to growth, we design, build and run the strategy, structure and processes behind a company.",
      "home.cta1": "Explore the Model", "home.time": "Istanbul", "home.scroll": "Scroll",
      "man.label": "Manifesto", "man.k1": "Structure", "man.k2": "Transparency", "man.k3": "Scalability", "man.k4": "Decision Quality",
      "man.text": "Growth demands structure. We turn scattered processes, unclear roles and gut-feel decisions into an operating model that is measurable, manageable and built to last.",
      "mod.label": "01 / Operating Model", "mod.h2a": "Systematic", "mod.h2b": "Growth.",
      "mod.lead": "Every project follows the same four-stage discipline: first we understand, then we design, implement together and make it last.",
      "st1.t": "Diagnose", "st1.d": "We examine the current structure, processes and numbers on site to surface the real bottlenecks.",
      "st2.t": "Design", "st2.d": "We lay out the target organisation, process flows and management indicators in a clear plan.",
      "st3.t": "Implement", "st3.d": "We take the plan to the floor with your team and roll out change step by step, measuring as we go.",
      "st4.t": "Govern", "st4.d": "Regular reporting and reviews make sure the gains are permanent.",
      "mod.dg": "Corporate Operating Model", "mod.stage": "Stage",
      "svc.label": "02 / Capabilities", "svc.h2a": "Built", "svc.h2b": "to Scale.",
      "svc.lead": "Four areas of expertise, one integrated view. Start with a single area or go end to end with us.",
      "svc.more": "Explore",
      "aud.label": "03 / Who We Work With", "aud.h2a": "Beside You", "aud.h2b": "at Every Stage.",
      "aud.lead": "It is your next step, not your company's size, that shapes our approach.",
      "aud.a1.t": "Start-ups", "aud.a1.d": "From idea to company: the right structure, the right start and a first-year roadmap.",
      "aud.a2.t": "Growing SMEs", "aud.a2.d": "From founder-dependent management to a company run by a system.",
      "aud.a3.t": "Family Businesses", "aud.a3.d": "Clear structure and rules for institutionalisation and handover between generations.",
      "aud.a4.t": "Corporates", "aud.a4.d": "Restructuring, new business units and efficiency programmes.",

      "cta.eyebrow": "Next step", "cta.l1": "Leave the complexity to us.", "cta.l2": "Let's build together.",
      "cta.lead": "Tell us briefly about your company and goal; we will come back with the roadmap that fits you best.",
      "cta.btn": "Book a call",
      "ftr.company": "Company", "ftr.kvkk": "Privacy Notice (KVKK)", "ftr.tag": "Horizon architects.",
      "ftr.blurb": "An Istanbul-based business consultancy providing end-to-end advisory on company formation, strategy, operations and finance.",
      "ftr.top": "Top",

      "svcp.eyebrow": "Company · Capabilities", "svcp.h1": "Services.",
      "svcp.lead": "From formation to governance: actionable, measurable consulting for every layer of your company.",
      "svcp.k.label": "Formation", "svcp.s.label": "Strategy", "svcp.o.label": "Operations", "svcp.f.label": "Finance",
      "svcp.note": "Work that requires a licensed lawyer or certified public accountant is carried out in cooperation with authorised lawyers and accountants.",

      "about.eyebrow": "About Us", "about.h1": "The Firm.",
      "about.lead": "Yeşil Ufuk is an Istanbul-based business and management consultancy. We work alongside companies on formation, strategy, organisation and financial management, building the structures that make decisions clearer and growth sustainable.",
      "about.ink": "We measure consulting by results, not reports. Our work is complete when the new structure is in place, your team owns it and the outcome can be measured.",
      "about.pr.label": "01 / Our Principles", "about.pr.h2a": "How", "about.pr.h2b": "We Work.",
      "about.p1.t": "Clarity", "about.p1.d": "Every engagement starts with a precise definition of the problem. Scope, objectives and success criteria are agreed in writing from day one.",
      "about.p2.t": "Accountability", "about.p2.d": "We don't stop at recommendations. We work with your team through implementation and share responsibility for the results.",
      "about.p3.t": "Measurability", "about.p3.d": "Every recommendation is tied to a concrete indicator, and progress is tracked together through regular reporting.",
      "about.p4.t": "Confidentiality", "about.p4.d": "All information you share is protected under a confidentiality agreement and used solely for the engagement.",
      "about.mv.label": "02 / Mission, Vision &amp; Values", "about.mv.h2": "Our Direction.",
      "about.mv.lead": "Why we exist, where we are heading and the principles behind our decisions.",
      "about.m.t": "Mission", "about.m.d": "To help businesses grow predictably and sustainably on a sound management structure.",
      "about.v.t": "Vision", "about.v.d": "To be a preferred partner in business and management consulting, recognised for reliability and tangible results.",
      "about.val.t": "Values", "about.val.d": "Integrity, transparent communication, confidentiality and measurable results. We deliver what we commit to.",
      "about.rc.label": "03 / Company Information", "about.rc.h2": "Company Details.",
      "about.rc.name": "Trade Name", "about.rc.act": "Field of Activity", "about.rc.type": "Company Type", "about.rc.typev": "Joint-Stock Company (A.Ş.)",
      "about.m.k": "06:00 · Dawn", "about.v.k": "12:00 · Zenith", "about.val.k": "18:00 · Horizon", "about.rc.reg": "Company Record", "about.rc.map": "Open in maps",
      "addr.country": "Turkey", "about.rc.city": "City",
      "about.h1a": "The structure",
      "about.h1b": "behind growth.",
      "meta.404.title": "Page not found | Yeşil Ufuk", "nf.h1a": "Nothing on", "nf.h1b": "the horizon.", "nf.lead": "The page you are looking for may have moved or never existed.",
      "about.rc.hq": "Head Office", "about.rc.lang": "Working Languages", "about.rc.langv": "Türkçe · English",

      "ct.eyebrow": "Contact · Start a Project", "ct.h1a": "Get", "ct.h1b": "in Touch.",
      "ct.lead": "Tell us about your company, your goal or the problem you're facing. We'll come back with the approach that suits you best.",
      "ct.pc.label": "01 / Process", "ct.pc.h2a": "How a Project", "ct.pc.h2b": "Begins.",
      "ct.pc.lead": "Seven clear steps from the first call to ongoing support. You know from the outset what each step will deliver.",
      "ct.t1.t": "Intro Call", "ct.t1.d": "A short first conversation where we listen to your needs and expectations.",
      "ct.t2.t": "Preliminary Analysis", "ct.t2.d": "We review the current situation, documents and priorities to define the scope.",
      "ct.t3.t": "Proposal &amp; Scope", "ct.t3.d": "A written proposal covering goals, timeline, deliverables and budget.",
      "ct.t4.t": "Design", "ct.t4.d": "A detailed plan of the new structure, processes and roadmap.",
      "ct.t5.t": "Implementation", "ct.t5.d": "Rolling the plan out step by step together with your team.",
      "ct.t6.t": "Go-Live", "ct.t6.d": "Measuring the new set-up, fine-tuning it and handing it over to your team.",
      "ct.t7.t": "Ongoing Support", "ct.t7.d": "Periodic reviews and advisory support whenever you need it.",
      "ct.bf.label": "02 / Project Brief", "ct.bf.h2a": "Tell Us", "ct.bf.h2b": "Your Project.",
      "ct.side.mail": "E-mail", "ct.side.addr": "Office", "ct.side.route": "Get directions",
      "form.name": "Full name", "form.email": "E-mail", "form.phone": "Phone", "form.company": "Company",
      "form.service": "Service area", "form.stage": "Company stage", "form.msg": "What outcome matters most to you?",
      "form.service.opts": "<option value=\"\">Select</option><option>Company Formation &amp; Organisation</option><option>Strategic Management</option><option>Operations &amp; Process Management</option><option>Financial Management Advisory</option><option>Not sure yet</option>",
      "form.stage.opts": "<option value=\"\">Select</option><option>Being formed</option><option>1–10 employees</option><option>10–50 employees</option><option>50+ employees</option>",
      "form.kvkk": "I have read the <a href=\"kvkk.html\">Privacy Notice (KVKK)</a> and consent to my personal data being processed for this request.",
      "form.note": "All information is kept confidential", "form.submit": "Send project brief",

      "kvkk.eyebrow": "Legal · Law No. 6698", "kvkk.h1": "Privacy Notice.",
      "kvkk.notice": "This notice is provided in Turkish, which is the legally binding version under Turkish law."
    }
  };

  const orig = new Map();      // key -> Turkish markup captured from the page
  const origAttr = new Map();  // key -> Turkish attribute value
  let current = "tr";

  function capture() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      if (!orig.has(k)) orig.set(k, el.tagName === "TITLE" ? el.textContent : el.innerHTML);
    });
    document.querySelectorAll("[data-i18n-content]").forEach((el) => {
      const k = el.dataset.i18nContent;
      if (!origAttr.has(k)) origAttr.set(k, el.getAttribute("content"));
    });
  }

  function lookup(lang, k) {
    if (lang !== "tr" && D[lang] && D[lang][k] != null) return D[lang][k];
    if (JS[lang] && JS[lang][k] != null) return JS[lang][k];
    if (orig.has(k)) return orig.get(k);
    return JS.tr[k];
  }

  function apply(lang) {
    current = LANGS.includes(lang) ? lang : "tr";
    document.documentElement.lang = current;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = lookup(current, el.dataset.i18n);
      if (v == null) return;
      if (el.tagName === "TITLE") {
        const tmp = document.createElement("textarea"); tmp.innerHTML = v; el.textContent = tmp.value;
      } else if (el.innerHTML !== v) {
        const wasValue = el.tagName === "SELECT" ? el.selectedIndex : -1;
        el.innerHTML = v;
        if (wasValue > -1) el.selectedIndex = wasValue;
      }
    });
    document.querySelectorAll("[data-i18n-content]").forEach((el) => {
      const k = el.dataset.i18nContent;
      const v = current === "tr" ? origAttr.get(k) : (D[current] && D[current][k]) || origAttr.get(k);
      if (v != null) el.setAttribute("content", v);
    });
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === current)));
    // self-referencing canonical per language (hreflang pairs: ?lang=en)
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) {
      if (!canon.dataset.base) canon.dataset.base = canon.getAttribute("href");
      const href = canon.dataset.base + (current === "en" ? "?lang=en" : "");
      canon.setAttribute("href", href);
      const ou = document.querySelector('meta[property="og:url"]'); if (ou) ou.setAttribute("content", href);
    }
    const ol = document.querySelector('meta[property="og:locale"]'); if (ol) ol.setAttribute("content", current === "en" ? "en_US" : "tr_TR");
  }

  function readSaved() {
    try {
      const q = new URLSearchParams(location.search).get("lang");
      if (q && LANGS.includes(q)) return q;
      const s = localStorage.getItem(KEY);
      if (s && LANGS.includes(s)) return s;
    } catch (e) { /* storage blocked */ }
    return "tr";
  }

  capture();
  const initial = readSaved();
  if (initial !== "tr") apply(initial);

  return {
    lang: () => current,
    t: (k, fb) => { const v = lookup(current, k); return v == null ? fb : v; },
    set(lang) {
      if (lang === current) return;
      apply(lang);
      try { localStorage.setItem(KEY, current); } catch (e) { /* ignore */ }
      try {
        const u = new URL(location.href);
        if (current === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
        history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: current } }));
    }
  };
})();
