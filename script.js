/* =========================================================
   No More Tears — Charge Grid
   Veškerá data na stránce jsou simulovaná (demo).
   ========================================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n, d = 0) => n.toLocaleString("cs-CZ", { minimumFractionDigits: d, maximumFractionDigits: d });

  // Deterministický generátor náhodných čísel, aby demo vypadalo pokaždé stejně
  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(42);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Nastaví canvas na správnou velikost podle CSS šířky a DPR
  function fitCanvas(canvas, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = cssHeight ?? canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  const css = getComputedStyle(document.documentElement);
  const COLORS = {
    accent: css.getPropertyValue("--accent").trim(),
    accent2: css.getPropertyValue("--accent-2").trim(),
    fault: css.getPropertyValue("--fault").trim(),
    muted: css.getPropertyValue("--muted").trim(),
    grid: "rgba(148,170,214,0.10)",
  };

  /* ---------------- Toast ---------------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
  }

  /* ---------------- Navigace ---------------- */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");

  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Zvýraznění aktivní sekce v menu
  const sectionLinks = $$(".nav__links a[href^='#']");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sectionLinks.forEach((a) => {
    const target = $(a.getAttribute("href"));
    if (target) sectionObserver.observe(target);
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    revealObserver.observe(el);
  });

  /* ---------------- Počítadla ---------------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const duration = prefersReducedMotion ? 0 : 1600;
      const start = performance.now();
      const step = (now) => {
        const p = duration ? Math.min((now - start) / duration, 1) : 1;
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => counterObserver.observe(el));

  /* ---------------- Hero: síť částic ---------------- */
  (function heroNetwork() {
    const canvas = $("#heroCanvas");
    const hero = canvas.parentElement;
    let ctx, w, h, nodes = [], running = true, mouse = { x: -999, y: -999 };

    function init() {
      ({ ctx, w, h } = fitCanvas(canvas, hero.clientHeight));
      const count = Math.min(90, Math.floor((w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
        hub: Math.random() < 0.08,
      }));
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) {
            const alpha = 1 - Math.sqrt(d2) / 140;
            ctx.strokeStyle = `rgba(55,245,160,${alpha * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(34,198,240,${(1 - md / 180) * 0.45})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hub ? n.r * 2.2 : n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.hub ? COLORS.accent : "rgba(232,238,252,0.55)";
        if (n.hub) { ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 14; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      requestAnimationFrame(frame);
    }

    init();
    if (prefersReducedMotion) { running = false; return; }
    frame();

    hero.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    hero.addEventListener("mouseleave", () => (mouse = { x: -999, y: -999 }));
    window.addEventListener("resize", init);
    new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting;
      if (running && !was) frame();
    }).observe(hero);
  })();

  /* ---------------- Grafy (canvas) ---------------- */
  function drawLineChart(canvas, data, { height = 220, color = COLORS.accent, unit = "" } = {}) {
    const { ctx, w, h } = fitCanvas(canvas, height);
    const pad = { l: unit ? 46 : 4, r: 6, t: 8, b: unit ? 20 : 4 };
    const min = Math.min(...data) * 0.9;
    const max = Math.max(...data) * 1.05;
    const x = (i) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);

    ctx.clearRect(0, 0, w, h);
    if (unit) {
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = COLORS.muted;
      ctx.strokeStyle = COLORS.grid;
      for (let i = 0; i <= 4; i++) {
        const v = min + ((max - min) * i) / 4;
        const yy = y(v);
        ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
        ctx.fillText(fmt(v), 0, yy + 4);
      }
      ctx.fillText("−60 s", pad.l, h - 4);
      ctx.textAlign = "right";
      ctx.fillText("teď", w - pad.r, h - 4);
      ctx.textAlign = "left";
    }

    const grad = ctx.createLinearGradient(0, pad.t, 0, h);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");

    ctx.beginPath();
    data.forEach((v, i) => {
      const px = x(i), py = y(v);
      if (i === 0) ctx.moveTo(px, py);
      else {
        const cx = (x(i - 1) + px) / 2;
        ctx.bezierCurveTo(cx, y(data[i - 1]), cx, py, px, py);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(x(data.length - 1), h - pad.b);
    ctx.lineTo(x(0), h - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    const lx = x(data.length - 1), ly = y(data[data.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  }

  /* ---------------- Data stanic ---------------- */
  const LOCATIONS = [
    ["Praha", "Chodov", 14.49, 50.03], ["Praha", "Letňany", 14.52, 50.13], ["Praha", "Smíchov", 14.40, 50.07],
    ["Praha", "Zličín", 14.29, 50.05], ["Praha", "Vysočany", 14.50, 50.10],
    ["Brno", "Olympia", 16.62, 49.14], ["Brno", "Královo Pole", 16.59, 49.23], ["Brno", "Líšeň", 16.69, 49.21],
    ["Ostrava", "Poruba", 18.16, 49.83], ["Ostrava", "Avion", 18.24, 49.80],
    ["Plzeň", "Borská pole", 13.33, 49.72], ["Plzeň", "Bory", 13.38, 49.74],
    ["Liberec", "Nisa", 15.04, 50.75], ["Olomouc", "Šantovka", 17.25, 49.59],
    ["České Budějovice", "IGY", 14.47, 48.97], ["Hradec Králové", "Futurum", 15.85, 50.20],
    ["Ústí nad Labem", "Forum", 14.04, 50.66], ["Pardubice", "Grand", 15.77, 50.04],
    ["Zlín", "Centro", 17.62, 49.21], ["Jihlava", "City Park", 15.59, 49.40],
    ["Karlovy Vary", "Varyáda", 12.86, 50.23], ["Humpolec", "D1 exit 90", 15.36, 49.54],
    ["Velké Meziříčí", "D1 exit 141", 16.01, 49.36], ["Rokycany", "D5", 13.59, 49.74],
    ["Lovosice", "D8", 14.05, 50.51], ["Mladá Boleslav", "Škoda Park", 14.90, 50.41],
    ["Tábor", "Kotnov", 14.66, 49.41], ["Kolín", "Centrum", 15.20, 50.03],
    ["Frýdek-Místek", "Frýda", 18.35, 49.68], ["Jablunkov", "Nádraží", 18.76, 49.58],
    ["Aš", "Hranice", 12.19, 50.22], ["Třebíč", "Zámostí", 15.88, 49.21],
    ["Znojmo", "Hradiště", 16.05, 48.86], ["Opava", "Silesia", 17.90, 49.94],
    ["Teplice", "Galerie", 13.82, 50.64], ["Most", "Central", 13.64, 50.50],
    ["Písek", "Lesík", 14.15, 49.31], ["Prostějov", "Haná", 17.11, 49.47],
    ["Přerov", "Galerie", 17.45, 49.45], ["Uherské Hradiště", "Morava", 17.46, 49.07],
    ["Břeclav", "D2", 16.88, 48.76], ["Trutnov", "Krkonoše", 15.91, 50.56],
    ["Český Krumlov", "Plešivec", 14.32, 48.81], ["Domažlice", "Chodsko", 12.93, 49.44],
    ["Klatovy", "Šumava", 13.29, 49.40], ["Jeseník", "Lázně", 17.20, 50.23],
  ];

  const STATUS_LABEL = { free: "Volná", charging: "Nabíjí", fault: "Porucha" };
  const STATUS_COLOR = { free: COLORS.accent, charging: COLORS.accent2, fault: COLORS.fault };

  const stations = LOCATIONS.map(([city, spot, lon, lat], i) => {
    const r = rand();
    const power = r < 0.25 ? 50 : r < 0.75 ? 150 : 350;
    const st = rand();
    const status = st < 0.05 ? "fault" : st < 0.55 ? "charging" : "free";
    return {
      id: "CG-" + String(100 + i * 7).padStart(4, "0"),
      city, spot, lon, lat, power,
      points: 2 + Math.floor(rand() * 4) * 2,
      price: power >= 350 ? 12.9 : power >= 150 ? 10.9 : 8.9,
      status,
      kw: status === "charging" ? Math.round(power * (0.35 + rand() * 0.55)) : 0,
    };
  });

  const listeners = new Set();
  const onStationsChange = (fn) => listeners.add(fn);
  const emitChange = (event) => listeners.forEach((fn) => fn(event));

  // Simulace změn stavu stanic
  setInterval(() => {
    const s = pick(stations);
    const prev = s.status;
    const r = Math.random();
    let next;
    if (prev === "fault") next = r < 0.4 ? "free" : "fault";
    else if (prev === "charging") next = r < 0.35 ? "free" : r < 0.37 ? "fault" : "charging";
    else next = r < 0.6 ? "charging" : r < 0.62 ? "fault" : "free";

    stations.forEach((st) => {
      if (st.status === "charging") {
        st.kw = Math.max(20, Math.min(st.power, Math.round(st.kw + (Math.random() - 0.5) * st.power * 0.12)));
      }
    });

    if (next !== prev) {
      s.status = next;
      s.kw = next === "charging" ? Math.round(s.power * (0.4 + Math.random() * 0.5)) : 0;
      emitChange({ station: s, prev, next });
    } else {
      emitChange(null);
    }
  }, 1500);

  /* ---------------- Hero mini karty ---------------- */
  (function heroCards() {
    const powerEl = $("#heroPower");
    const sessionsEl = $("#heroSessions");
    const co2El = $("#heroCo2");
    const spark = $("#heroSpark");
    let power = 4812, sessions = 143, co2 = 3.8;
    const series = Array.from({ length: 40 }, (_, i) => 4600 + Math.sin(i / 4) * 180 + Math.random() * 120);

    function tick() {
      power = Math.max(3800, Math.min(5600, power + (Math.random() - 0.48) * 160));
      sessions = Math.max(110, Math.min(180, sessions + Math.round((Math.random() - 0.5) * 6)));
      co2 += Math.random() * 0.01;
      series.push(power); series.shift();
      powerEl.textContent = fmt(Math.round(power));
      sessionsEl.textContent = sessions;
      co2El.textContent = fmt(co2, 2);
      drawLineChart(spark, series, { height: 80 });
    }
    tick();
    setInterval(tick, 1200);
    window.addEventListener("resize", () => drawLineChart(spark, series, { height: 80 }));
  })();

  /* ---------------- Charge Grid: galerie obrazovek ---------------- */
  (function productShots() {
    const tabs = $$(".dash-tab");
    const img = $("#shotImg");
    const link = $("#shotLink");
    const caption = $("#shotCaption");
    const dashPath = $("#dashPath");

    // Přednačtení, ať přepínání neblikne
    tabs.forEach((t) => { new Image().src = `img/chargegrid/${t.dataset.shot}.jpg`; });

    function activate(tab) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      const src = `img/chargegrid/${tab.dataset.shot}.jpg`;
      img.src = src;
      img.alt = `Charge Grid — ${tab.textContent.trim()}`;
      link.href = src;
      caption.textContent = tab.dataset.caption;
      dashPath.textContent = tab.dataset.path;
    }
    tabs.forEach((t) => t.addEventListener("click", () => activate(t)));
  })();


  /* ---------------- Pro koho (přepínač) ---------------- */
  const audSwitch = $(".audience__switch");
  const audSlider = $(".audience__slider");
  const audButtons = $$("button", audSwitch);

  function moveSlider() {
    const active = audButtons.find((b) => b.classList.contains("is-active"));
    audSlider.style.width = active.offsetWidth + "px";
    audSlider.style.transform = `translateX(${active.offsetLeft - 5}px)`;
  }
  audButtons.forEach((btn) => btn.addEventListener("click", () => {
    audButtons.forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    $$("[data-aud-panel]").forEach((p) => {
      const on = p.dataset.audPanel === btn.dataset.aud;
      p.hidden = !on;
      if (on) p.classList.add("is-visible");
    });
    moveSlider();
  }));
  window.addEventListener("resize", moveSlider);
  document.fonts?.ready.then(moveSlider);
  moveSlider();

  // Telefon — průběh nabíjení
  (function phoneCharging() {
    const ring = $("#phoneRing");
    const pctEl = $("#phonePct");
    const etaEl = $("#phoneEta");
    const C = 2 * Math.PI * 50;
    let pct = 42;
    function render() {
      ring.style.strokeDashoffset = C * (1 - pct / 100);
      pctEl.textContent = pct;
      etaEl.textContent = pct >= 100 ? "Hotovo ✓" : `${Math.round((100 - pct) * 0.31)} min`;
    }
    render();
    setInterval(() => {
      pct = pct >= 100 ? 18 : Math.min(100, pct + 2);
      render();
    }, 900);
  })();

  /* ---------------- Mapa ČR ---------------- */
  (function czMap() {
    const svg = $("#czMap");
    const NS = "http://www.w3.org/2000/svg";
    const list = $("#mapList");
    const search = $("#mapSearch");
    const tooltip = $("#mapTooltip");
    const mapCanvas = $(".map-canvas");
    let filter = "all";
    let selectedId = null;

    const proj = (lon, lat) => [(lon - 12) * 140 + 10, (51.08 - lat) * 215 + 4];

    // Zjednodušená hranice ČR (lon, lat)
    const BORDER = [
      [12.09, 50.25], [12.32, 50.18], [12.5, 50.4], [13.0, 50.5], [13.5, 50.7], [13.9, 50.79], [14.3, 50.88],
      [14.6, 51.02], [14.83, 50.87], [15.0, 51.01], [15.3, 50.95], [15.8, 50.75], [16.0, 50.6], [16.3, 50.66],
      [16.45, 50.5], [16.2, 50.42], [16.7, 50.2], [17.0, 50.42], [17.4, 50.27], [17.7, 50.32], [18.0, 50.05],
      [18.55, 49.9], [18.85, 49.5], [18.4, 49.3], [18.1, 49.05], [17.65, 48.85], [17.2, 48.86], [16.95, 48.6],
      [16.5, 48.78], [15.8, 48.85], [15.0, 49.0], [14.7, 48.6], [14.0, 48.6], [13.8, 48.77], [13.4, 49.1],
      [12.9, 49.35], [12.45, 49.7], [12.5, 49.95], [12.2, 50.1],
    ];
    const borderPts = BORDER.map(([lo, la]) => proj(lo, la).join(",")).join(" ");

    const CITIES = {
      Praha: [14.42, 50.08], Brno: [16.61, 49.19], Ostrava: [18.29, 49.83], Plzeň: [13.38, 49.75],
      Liberec: [15.06, 50.77], Olomouc: [17.25, 49.59], "Č. Budějovice": [14.47, 48.97],
      "Hradec Králové": [15.83, 50.21], "Ústí n. L.": [14.03, 50.66], Zlín: [17.67, 49.22],
      Jihlava: [15.59, 49.40], "K. Vary": [12.87, 50.23],
    };
    const ROADS = [
      ["Praha", "Jihlava", "Brno", "Olomouc", "Ostrava"],
      ["Plzeň", "Praha", "Hradec Králové"],
      ["Praha", "Ústí n. L."],
      ["Praha", "Liberec"],
      ["Praha", "Č. Budějovice"],
      ["K. Vary", "Plzeň"],
      ["Brno", "Zlín"],
    ];

    svg.innerHTML = `
      <defs>
        <pattern id="dotGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.4" class="cz-grid"/>
        </pattern>
        <clipPath id="czClip"><polygon points="${borderPts}"/></clipPath>
      </defs>
      <polygon points="${borderPts}" class="cz-shape"/>
      <rect width="980" height="560" fill="url(#dotGrid)" clip-path="url(#czClip)"/>
    `;

    ROADS.forEach((road) => {
      const pl = document.createElementNS(NS, "polyline");
      pl.setAttribute("points", road.map((c) => proj(...CITIES[c]).join(",")).join(" "));
      pl.setAttribute("class", "cz-road");
      svg.appendChild(pl);
    });

    Object.entries(CITIES).forEach(([name, [lo, la]]) => {
      const [x, y] = proj(lo, la);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x + 12);
      t.setAttribute("y", y - 10);
      t.setAttribute("class", "cz-city");
      t.textContent = name;
      svg.appendChild(t);
    });

    // Stanice
    const nodes = new Map();
    stations.forEach((s) => {
      const [x, y] = proj(s.lon, s.lat);
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "station");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${s.city} ${s.spot}`);
      g.innerHTML = `
        <circle class="halo" cx="${x}" cy="${y}" r="7" fill="none" stroke-width="2"/>
        <circle class="core" cx="${x}" cy="${y}" r="6" stroke="#070b16" stroke-width="2"/>
      `;
      g.addEventListener("click", (e) => { e.stopPropagation(); select(s.id); });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(s.id); }
      });
      svg.appendChild(g);
      nodes.set(s.id, g);
      paintNode(s);
    });

    function paintNode(s) {
      const g = nodes.get(s.id);
      const color = STATUS_COLOR[s.status];
      g.querySelector(".core").setAttribute("fill", color);
      const halo = g.querySelector(".halo");
      halo.setAttribute("stroke", color);
      halo.style.display = s.status === "charging" ? "" : "none";
    }

    const matches = (s) => {
      const q = search.value.trim().toLowerCase();
      const okQ = !q || `${s.city} ${s.spot} ${s.id}`.toLowerCase().includes(q);
      const okF = filter === "all" || (filter === "free" && s.status === "free") || (filter === "fast" && s.power >= 150);
      return okQ && okF;
    };

    function renderList() {
      const visible = stations.filter(matches);
      stations.forEach((s) => nodes.get(s.id).classList.toggle("is-dim", !matches(s)));
      list.innerHTML = visible.length
        ? visible.map((s) => `
          <li data-id="${s.id}" class="${s.id === selectedId ? "is-selected" : ""}" tabindex="0">
            <span><span class="name">${s.city} — ${s.spot}</span><span class="meta">${s.id} · ${s.power} kW · ${s.points} body</span></span>
            <span class="tag tag--${s.status}">${STATUS_LABEL[s.status]}</span>
          </li>`).join("")
        : `<li class="empty">Žádná stanice neodpovídá hledání.</li>`;
    }

    function showTooltip(s) {
      const g = nodes.get(s.id);
      const cr = g.querySelector(".core").getBoundingClientRect();
      const mr = mapCanvas.getBoundingClientRect();
      const x = cr.left + cr.width / 2 - mr.left;
      const y = cr.top + cr.height / 2 - mr.top;
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <h4>${s.city} — ${s.spot}</h4>
        <div class="row"><span>ID</span><b>${s.id}</b></div>
        <div class="row"><span>Stav</span><b><span class="tag tag--${s.status}">${STATUS_LABEL[s.status]}</span></b></div>
        <div class="row"><span>Max. výkon</span><b>${s.power} kW</b></div>
        <div class="row"><span>Nabíjecí body</span><b>${s.points}</b></div>
        <div class="row"><span>Cena</span><b>${fmt(s.price, 1)} Kč/kWh</b></div>
        <button class="btn btn--primary btn--small" data-reserve ${s.status !== "free" ? "disabled" : ""}>
          ${s.status === "free" ? "Rezervovat na 30 min" : s.status === "fault" ? "Mimo provoz" : "Obsazeno"}
        </button>`;
      // Udrží tooltip uvnitř mapy
      const half = tooltip.offsetWidth / 2;
      const clampedX = Math.max(half + 8, Math.min(mr.width - half - 8, x));
      tooltip.style.left = clampedX + "px";
      tooltip.style.top = y + "px";
      tooltip.style.transform = y < tooltip.offsetHeight + 24
        ? "translate(-50%, 16px)"
        : "translate(-50%, calc(-100% - 16px))";
    }

    function select(id) {
      selectedId = id;
      nodes.forEach((g, gid) => g.classList.toggle("is-selected", gid === id));
      const s = stations.find((st) => st.id === id);
      renderList();
      showTooltip(s);
      list.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
    }

    function deselect() {
      selectedId = null;
      tooltip.hidden = true;
      nodes.forEach((g) => g.classList.remove("is-selected"));
      renderList();
    }

    tooltip.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!e.target.closest("[data-reserve]")) return;
      const s = stations.find((st) => st.id === selectedId);
      toast(`⚡ Místo na ${s.city} — ${s.spot} rezervováno na 30 minut (demo).`);
      deselect();
    });
    mapCanvas.addEventListener("click", deselect);

    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]");
      if (li) select(li.dataset.id);
    });
    list.addEventListener("keydown", (e) => {
      const li = e.target.closest("li[data-id]");
      if (li && e.key === "Enter") select(li.dataset.id);
    });

    search.addEventListener("input", () => { tooltip.hidden = true; renderList(); });
    $("#mapFilters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#mapFilters .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
      filter = chip.dataset.filter;
      tooltip.hidden = true;
      renderList();
    });

    onStationsChange((e) => {
      if (!e) return;
      paintNode(e.station);
      renderList();
      if (selectedId === e.station.id && !tooltip.hidden) showTooltip(e.station);
    });
    window.addEventListener("resize", () => (tooltip.hidden = true));

    renderList();
  })();

  /* ---------------- Feature karty: světlo za kurzorem ---------------- */
  $$(".feature").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------------- Kontaktní formulář ---------------- */
  const form = $("#contactForm");
  const validators = {
    name: (v) => v.trim().length >= 2 || "Zadejte prosím jméno.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Zadejte platný e-mail.",
    message: (v) => v.trim().length >= 10 || "Napište nám alespoň pár slov (min. 10 znaků).",
  };

  function validateField(field) {
    const check = validators[field.name];
    if (!check) return true;
    const result = check(field.value);
    const row = field.closest(".form__row");
    row.classList.toggle("has-error", result !== true);
    row.querySelector(".form__error").textContent = result === true ? "" : result;
    return result === true;
  }

  form.addEventListener("input", (e) => {
    if (e.target.closest(".has-error")) validateField(e.target);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = $$("input, textarea", form);
    const ok = fields.map(validateField).every(Boolean);
    if (!ok) {
      fields.find((f) => f.closest(".has-error"))?.focus();
      return;
    }
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    btn.textContent = "Odesílám…";
    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.textContent = "Odeslat";
      $("#formSuccess").hidden = false;
      setTimeout(() => ($("#formSuccess").hidden = true), 5000);
    }, 900);
  });

  /* ---------------- Patička ---------------- */
  $("#year").textContent = new Date().getFullYear();
})();
