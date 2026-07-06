/* ==========================================================================
   HSM // GRID — interactions
   Native scroll + GSAP ScrollTrigger. Everything degrades: no GSAP means a
   fully readable static site; reduced motion drops pulses/boot/ambience.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  document.body.classList.add("js");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  const state = {
    power: "online",
    tweens: []          // ambient tweens that standby mode pauses
  };

  /* ---------- grid power (online / standby) ---------- */

  function setPower(mode) {
    state.power = mode;
    const standby = mode === "standby";
    document.body.classList.toggle("standby", standby);

    const btn = $("#power-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", String(!standby));
      const label = btn.querySelector(".power-label");
      if (label) label.textContent = standby ? "STANDBY" : "ONLINE";
    }

    const pw = $("#hud-power");
    if (pw) {
      pw.innerHTML = '<span class="sig-dot"></span>' + (standby ? "STANDBY" : "ONLINE");
      pw.classList.toggle("is-standby", standby);
    }

    state.tweens.forEach((tw) => {
      if (!tw) return;
      if (standby) tw.pause();
      else tw.play();
    });
  }

  function initPower() {
    const btn = $("#power-toggle");
    const KEY = "hsm-grid-power";
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    setPower(saved === "standby" ? "standby" : "online");

    btn && btn.addEventListener("click", () => {
      const next = state.power === "online" ? "standby" : "online";
      setPower(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- scroll bolt (left-edge circuit trace) ---------- */

  function bolt() {
    const rail = $("#bolt-rail");
    const boltEl = $("#bolt");
    const lit = $("#bolt-trace-lit");
    if (!rail || !boltEl || !lit) return;

    const BOLT_H = 20;

    const pct = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const place = (p, jitter) => {
      const travel = window.innerHeight - BOLT_H;
      const y = p * travel;
      boltEl.style.transform = "translate(" + (jitter || 0).toFixed(1) + "px," + y.toFixed(1) + "px)";
      lit.style.height = (y + BOLT_H * 0.55).toFixed(1) + "px";
    };

    // Reduced motion: track scroll exactly, no easing, no arcing.
    if (prefersReducedMotion) {
      const update = () => place(pct(), 0);
      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update, { passive: true });
      return;
    }

    let current = pct();
    let idleFrames = 0;

    (function loop() {
      const target = pct();
      const delta = target - current;
      current += delta * 0.12;

      const speed = Math.abs(delta);
      const arcing = speed > 0.004 && state.power !== "standby";
      boltEl.classList.toggle("is-arcing", arcing);
      const jitter = arcing ? (Math.random() - 0.5) * Math.min(4, speed * 260) : 0;

      place(current, jitter);

      idleFrames = speed < 0.0004 ? idleFrames + 1 : 0;
      if (idleFrames > 30) {
        // Settled: park exactly and wait for the next scroll instead of spinning rAF.
        place(target, 0);
        boltEl.classList.remove("is-arcing");
        current = target;
        const wake = () => {
          idleFrames = 0;
          window.removeEventListener("scroll", wake);
          requestAnimationFrame(loop);
        };
        window.addEventListener("scroll", wake, { passive: true });
        return;
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- boot sequence ---------- */

  function runBoot() {
    return new Promise((resolve) => {
      const el = $("#boot");
      const linesEl = $("#boot-lines");
      const skip = $("#boot-skip");
      const KEY = "hsm-booted";

      let seen = false;
      try { seen = !!sessionStorage.getItem(KEY); } catch (e) { /* ignore */ }

      if (!el || !linesEl || prefersReducedMotion || seen) {
        el && el.remove();
        resolve(false);
        return;
      }

      const rows = [
        { text: "> HSM//GRID v2.0", cls: "" },
        { text: "> LOADING SECTIONS [5/5] ....... OK", cls: "" },
        { text: "> RENDERING INTERFACE .......... OK", cls: "" },
        { text: "> ONLINE", cls: "online" }
      ];

      el.hidden = false;
      document.body.classList.add("boot-lock");

      let i = 0;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        try { sessionStorage.setItem(KEY, "1"); } catch (e) { /* ignore */ }
        el.classList.add("boot-done");
        document.body.classList.remove("boot-lock");
        setTimeout(() => { el.remove(); resolve(true); }, 430);
      };

      const tick = setInterval(() => {
        if (i < rows.length) {
          const div = document.createElement("div");
          div.textContent = rows[i].text;
          if (rows[i].cls) div.className = rows[i].cls;
          linesEl.appendChild(div);
          i += 1;
        } else {
          clearInterval(tick);
          setTimeout(finish, 300);
        }
      }, 185);

      skip && skip.addEventListener("click", finish);
      setTimeout(finish, 3400); // hard safety valve
    });
  }

  /* ---------- hero: cursor-reactive grid canvas ---------- */

  function heroGrid() {
    const canvas = $("#hero-grid");
    const hero = $("#section-hero");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const SPACING = 38;
    const RADIUS = 170;

    let w = 0, h = 0, dots = [];
    let needsFrame = true;
    const mouse = { x: -1e4, y: -1e4, on: false };

    function build() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = hero.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const ox = (w % SPACING) / 2;
      const oy = (h % SPACING) / 2;
      for (let y = oy; y <= h; y += SPACING) {
        for (let x = ox; x <= w; x += SPACING) {
          dots.push({ x, y, e: 0 });
        }
      }
      needsFrame = true;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const g = document.body.classList.contains("standby") ? 0.35 : 1;
      let alive = false;

      for (const p of dots) {
        let target = 0;
        if (mouse.on) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          target = Math.max(0, 1 - dist / RADIUS);
          target *= target;
        }
        p.e += (target - p.e) * 0.14;
        if (p.e > 0.004) alive = true;

        const alpha = 0.085 + p.e * 0.6 * g;
        const r = 1.05 + p.e * 1.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.2832);
        ctx.fillStyle = p.e > 0.12
          ? "rgba(125, 249, 255, " + alpha.toFixed(3) + ")"
          : "rgba(120, 180, 255, " + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      return alive;
    }

    build();

    // Static field: reduced motion or touch devices get the calm resting state.
    if (prefersReducedMotion || !finePointer) {
      draw();
      window.addEventListener("resize", () => { build(); draw(); }, { passive: true });
      return;
    }

    hero.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.on = true;
      needsFrame = true;
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      mouse.on = false;
      needsFrame = true;
    });

    window.addEventListener("resize", build, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) needsFrame = true;
    });

    (function loop() {
      if (needsFrame) {
        const alive = draw();
        needsFrame = alive || mouse.on;
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- HUD telemetry ---------- */

  function hud() {
    const timeEl = $("#hud-time");

    if (timeEl) {
      const pad = (n) => String(n).padStart(2, "0");
      const tickTime = () => {
        const n = new Date();
        timeEl.textContent = pad(n.getHours()) + ":" + pad(n.getMinutes()) + ":" + pad(n.getSeconds());
      };
      tickTime();
      setInterval(tickTime, 1000);
    }
  }

  /* ---------- active-section spy (nav + district rail) ---------- */

  function sectionSpy() {
    if (!("IntersectionObserver" in window)) return;

    const ids = {
      hero: "#section-hero",
      map: "#section-map",
      command: "#section-command",
      projects: "#section-projects",
      experience: "#section-experience",
      skills: "#section-skills",
      comms: "#section-comms"
    };

    const links = $$("a[data-district]");
    const sections = Object.entries(ids)
      .map(([key, sel]) => ({ key, el: $(sel) }))
      .filter((s) => s.el);

    const hudSection = $("#hud-section");
    const hudNames = {
      hero: "HOME", map: "MAP", command: "ABOUT", projects: "PROJECTS",
      experience: "EXPERIENCE", skills: "SKILLS", comms: "CONTACT"
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hit = sections.find((s) => s.el === entry.target);
        if (!hit) return;
        links.forEach((a) => a.classList.toggle("active", a.dataset.district === hit.key));
        if (hudSection) hudSection.textContent = hudNames[hit.key] || hit.key.toUpperCase();
      });
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });

    sections.forEach((s) => io.observe(s.el));
  }

  /* ---------- scroll progress ---------- */

  function progress() {
    const bar = $("#scroll-progress-bar");
    const hudScroll = $("#hud-scroll");
    if (!bar) return;
    let queued = false;

    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      const clamped = Math.min(100, Math.max(0, pct));
      bar.style.width = clamped.toFixed(2) + "%";
      if (hudScroll) hudScroll.textContent = Math.round(clamped) + "%";
    };

    window.addEventListener("scroll", () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  function setupYear() {
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ---------- city map: hover-lit traces, travelling pulses, click-to-travel ---------- */

  function cityMap() {
    const svg = $("#city-map");
    if (!svg) return;

    const setLit = (g, on) => {
      g.classList.toggle("lit", on);
      const path = g.dataset.path && document.getElementById(g.dataset.path);
      if (path) path.classList.toggle("lit", on);
    };

    $$(".district", svg).forEach((g) => {
      g.addEventListener("pointerenter", () => setLit(g, true));
      g.addEventListener("pointerleave", () => setLit(g, false));
      g.addEventListener("focus", () => setLit(g, true));
      g.addEventListener("blur", () => setLit(g, false));

      const travel = () => {
        const target = g.dataset.target && $(g.dataset.target);
        if (!target) return;
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        history.replaceState(null, "", g.dataset.target);
      };
      g.addEventListener("click", travel);
      g.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          travel();
        }
      });
    });

    // Travelling signal pulses (hub -> district), organic staggering.
    const pulses = $$(".map-pulse", svg);
    if (prefersReducedMotion || !hasGSAP) {
      pulses.forEach((p) => p.remove());
      return;
    }

    pulses.forEach((pulse) => {
      const path = document.getElementById(pulse.dataset.path);
      if (!path) { pulse.remove(); return; }
      const length = path.getTotalLength();
      const st = { t: 0 };

      const place = () => {
        const pt = path.getPointAtLength(st.t * length);
        pulse.setAttribute("cx", pt.x.toFixed(2));
        pulse.setAttribute("cy", pt.y.toFixed(2));
        const envelope = Math.min(1, 4 * st.t * (1 - st.t) + 0.05);
        pulse.setAttribute("opacity", (0.9 * envelope).toFixed(3));
      };
      place();

      const tw = gsap.to(st, {
        t: 1,
        duration: Math.max(1.6, length / 95),
        ease: "none",
        repeat: -1,
        delay: Math.random() * 3,
        repeatDelay: 1.4 + Math.random() * 2.8,
        onUpdate: place
      });
      state.tweens.push(tw);
      if (state.power === "standby") tw.pause();
    });
  }

  /* ---------- transit line ---------- */

  function transit() {
    const root = $("#transit");
    if (!root) return;

    const stations = $$(".station", root);
    const tpCode = $("#tp-code");
    const tpTitle = $("#tp-title");
    const tpDesc = $("#tp-desc");

    const setActive = (index) => {
      stations.forEach((s, i) => s.classList.toggle("is-active", i === index));
      const s = stations[index];
      if (!s) return;
      if (tpCode) tpCode.textContent = (s.dataset.code || "") + " · " + (s.dataset.date || "");
      if (tpTitle) tpTitle.textContent = s.dataset.title || "";
      const detail = s.querySelector(".station-detail");
      if (tpDesc) tpDesc.textContent = detail ? detail.textContent.trim() : "";
    };

    stations.forEach((s, i) => {
      const node = s.querySelector(".station-node");
      const activate = () => setActive(i);
      s.addEventListener("pointerenter", activate);
      if (node) {
        node.addEventListener("focus", activate);
        node.addEventListener("click", activate);
      }
    });

    const current = stations.findIndex((s) => s.classList.contains("is-current"));
    setActive(current > -1 ? current : stations.length - 1);

    // Employer bracket: spans ST-03 → ST-05 (BESIX Watpac era) in horizontal layout.
    const employerSpan = $("#employer-span");
    const mq = window.matchMedia("(min-width: 861px)");

    const layoutEmployer = () => {
      if (!employerSpan) return;
      if (!mq.matches) return; // hidden by CSS in vertical mode
      const track = root.querySelector(".transit-track");
      const nodeA = stations[2] && stations[2].querySelector(".station-node");
      const nodeB = stations[4] && stations[4].querySelector(".station-node");
      if (!track || !nodeA || !nodeB) return;
      const t = track.getBoundingClientRect();
      const a = nodeA.getBoundingClientRect();
      const b = nodeB.getBoundingClientRect();
      const left = a.left + a.width / 2 - t.left;
      const width = b.left + b.width / 2 - t.left - left;
      employerSpan.style.left = left.toFixed(1) + "px";
      employerSpan.style.width = Math.max(0, width).toFixed(1) + "px";
    };

    // Travelling pulse along the line (horizontal >=861px, vertical below).
    const pulse = root.querySelector(".transit-pulse");
    let tween = null;

    const build = () => {
      layoutEmployer();
      if (!pulse || prefersReducedMotion || !hasGSAP) return;
      if (tween) {
        const idx = state.tweens.indexOf(tween);
        if (idx > -1) state.tweens.splice(idx, 1);
        tween.kill();
        tween = null;
      }
      const line = root.querySelector(".transit-line");
      if (!line) return;
      const horizontal = mq.matches;
      const rect = line.getBoundingClientRect();
      const distance = Math.max(0, (horizontal ? rect.width : rect.height) - 10);
      const st = { t: 0 };

      tween = gsap.to(st, {
        t: 1,
        duration: 9,
        ease: "none",
        repeat: -1,
        repeatDelay: 1.4,
        onUpdate: () => {
          const envelope = Math.min(1, 5 * st.t * (1 - st.t) + 0.05);
          pulse.style.opacity = envelope.toFixed(3);
          const d = (st.t * distance).toFixed(1);
          pulse.style.transform = horizontal
            ? "translateX(" + d + "px)"
            : "translateY(" + d + "px)";
        }
      });
      state.tweens.push(tween);
      if (state.power === "standby") tween.pause();
    };

    if (pulse && (prefersReducedMotion || !hasGSAP)) pulse.remove();

    build();
    window.addEventListener("load", layoutEmployer);
    if (mq.addEventListener) mq.addEventListener("change", build);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    }, { passive: true });
  }

  /* ---------- skills network (generated SVG) ---------- */

  function skillsNetwork() {
    const svg = $("#skills-map");
    if (!svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const clusters = [
      { name: "SERVICES ENGINEERING", skills: ["HV/LV DIST", "VSD / MSSB", "BMS CONTROLS", "DALI", "ITP · ITC · O&M"] },
      { name: "SOFTWARE & AUTOMATION", skills: ["PYTHON", "JAVASCRIPT", "MATLAB", "APPS SCRIPT"] },
      { name: "DATA & PYTHON", skills: ["SCRAPING", "PANDAS", "SCORING MODELS", "REGRESSION"] },
      { name: "HARDWARE & SYSTEMS", skills: ["EMBEDDED C", "ESP32", "VERILOG / VHDL"] },
      { name: "SITE WORKFLOWS", skills: ["D&C DELIVERY", "SEQUENCING", "SUBCONTRACTORS", "ACONEX", "BLUEBEAM"] }
    ];

    const CX = 540, CY = 340, RX = 280, RY = 185, LEAF = 120;
    const angles = [-90, -18, 54, 126, 198].map((deg) => (deg * Math.PI) / 180);

    const make = (tag, attrs, cls) => {
      const node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
      if (cls) node.setAttribute("class", cls);
      return node;
    };

    const edges = make("g", {}, "sk-edges");
    const nodes = make("g", {}, "sk-nodes");
    svg.appendChild(edges);
    svg.appendChild(nodes);

    nodes.appendChild(make("circle", { cx: CX, cy: CY, r: 9 }, "sk-core"));
    nodes.appendChild(make("circle", { cx: CX, cy: CY, r: 17 }, "sk-core-ring"));
    const coreLabel = make("text", { x: CX, y: CY + 36, "text-anchor": "middle" }, "sk-core-label");
    coreLabel.textContent = "HSM // CORE";
    nodes.appendChild(coreLabel);

    clusters.forEach((cluster, ci) => {
      const A = angles[ci];
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const hx = CX + RX * cosA;
      const hy = CY + RY * sinA;

      edges.appendChild(make("line", { x1: CX, y1: CY, x2: hx.toFixed(1), y2: hy.toFixed(1), "data-cluster": ci }, "sk-edge sk-edge-core"));

      const hub = make("g", { "data-cluster": ci, tabindex: 0, role: "group", "aria-label": cluster.name }, "sk-hub");
      hub.appendChild(make("circle", { cx: hx.toFixed(1), cy: hy.toFixed(1), r: 16 }, "sk-hub-ring"));
      hub.appendChild(make("circle", { cx: hx.toFixed(1), cy: hy.toFixed(1), r: 6.5 }, "sk-hub-core"));

      // Label sits INWARD of the hub (toward the core) — that ring is empty,
      // so titles can never collide with the leaf fan, which points outward.
      // A paint-order halo (CSS) keeps text legible where it crosses the spoke.
      const dxc = CX - hx, dyc = CY - hy;
      const dl = Math.hypot(dxc, dyc) || 1;
      const ux = dxc / dl, uy = dyc / dl;
      const lx = hx + 44 * ux;
      const ly = hy + 44 * uy + 4;
      const anchor = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
      const hubLabel = make("text", { x: lx.toFixed(1), y: ly.toFixed(1), "text-anchor": anchor }, "sk-hub-label");
      hubLabel.textContent = cluster.name;
      hub.appendChild(hubLabel);
      nodes.appendChild(hub);

      const n = cluster.skills.length;
      const spread = (Math.min(130, 36 * (n - 1)) * Math.PI) / 180;
      const step = n > 1 ? spread / (n - 1) : 0;
      let midCount = 0; // stagger consecutive middle-anchored labels into two rows

      cluster.skills.forEach((skill, si) => {
        const a = A + (si - (n - 1) / 2) * step;
        const x = hx + LEAF * Math.cos(a);
        const y = hy + LEAF * Math.sin(a);

        edges.appendChild(make("line", { x1: hx.toFixed(1), y1: hy.toFixed(1), x2: x.toFixed(1), y2: y.toFixed(1), "data-cluster": ci }, "sk-edge sk-edge-leaf"));

        const leaf = make("g", { "data-cluster": ci }, "sk-leaf");
        leaf.appendChild(make("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 4.6 }, "sk-leaf-dot"));

        const cosL = Math.cos(a);
        const anchorL = cosL > 0.35 ? "start" : cosL < -0.35 ? "end" : "middle";
        const tx = x + (anchorL === "start" ? 10 : anchorL === "end" ? -10 : 0);
        let ty;
        if (anchorL === "middle") {
          midCount += 1;
          const rowShift = midCount % 2 === 0 ? 15 : 0;
          ty = y + (Math.sin(a) > 0 ? 20 + rowShift : -(12 + rowShift));
        } else {
          ty = y + 4;
        }
        const label = make("text", { x: tx.toFixed(1), y: ty.toFixed(1), "text-anchor": anchorL }, "sk-leaf-label");
        label.textContent = skill;
        leaf.appendChild(label);
        nodes.appendChild(leaf);
      });
    });

    // Light a whole cluster on hover/focus; dim the rest.
    let current = null;
    const setCluster = (ci, on) => {
      svg.classList.toggle("focusing", on);
      $$('[data-cluster="' + ci + '"]', svg).forEach((n) => n.classList.toggle("lit", on));
    };
    const clear = () => {
      if (current !== null) { setCluster(current, false); current = null; }
    };

    svg.addEventListener("pointerover", (event) => {
      const g = event.target.closest("[data-cluster]");
      if (!g) return;
      const ci = g.dataset.cluster;
      if (ci === current) return;
      clear();
      current = ci;
      setCluster(ci, true);
    });
    svg.addEventListener("pointerleave", clear);
    svg.addEventListener("focusin", (event) => {
      const g = event.target.closest(".sk-hub");
      if (!g) return;
      clear();
      current = g.dataset.cluster;
      setCluster(current, true);
    });
    svg.addEventListener("focusout", clear);
  }

  /* ---------- project modals ---------- */

  function modals() {
    const overlay = $("#modal-overlay");
    const modal = $("#modal");
    const titleEl = $("#modal-title");
    const descEl = $("#modal-desc");
    const tagEl = $("#modal-tag");
    const statusEl = $("#modal-status");
    const stackEl = $("#modal-stack");
    const closeBtn = $("#modal-close");
    if (!overlay || !modal || !titleEl || !descEl) return;

    let lastFocused = null;

    const open = (card) => {
      lastFocused = card;
      let data = {};
      try { data = JSON.parse(card.dataset.project || "{}"); } catch (e) { data = {}; }

      titleEl.textContent = data.title || (card.querySelector("h3") ? card.querySelector("h3").textContent : "Project");
      descEl.textContent = data.desc || "";
      if (tagEl) tagEl.textContent = data.tag || "PROJECT";
      if (statusEl) {
        const status = String(data.status || "");
        statusEl.textContent = status ? "[ " + status + " ]" : "";
        statusEl.className = "status mono status-" + status.toLowerCase().replace(/[^a-z]/g, "");
      }
      if (stackEl) stackEl.textContent = data.stack || "";

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-lock");
      closeBtn && closeBtn.focus();

      if (hasGSAP && !prefersReducedMotion) {
        gsap.fromTo(modal, { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: "power2.out" });
      }
    };

    const close = () => {
      const finish = () => {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-lock");
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      };
      if (hasGSAP && !prefersReducedMotion) {
        gsap.to(modal, { opacity: 0, y: 10, scale: 0.97, duration: 0.18, ease: "power2.in", onComplete: finish });
      } else {
        finish();
      }
    };

    $$(".project-card").forEach((card) => {
      card.addEventListener("click", () => open(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(card);
        }
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    closeBtn && closeBtn.addEventListener("click", close);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  /* ---------- scroll reveals ---------- */

  function reveals() {
    if (!hasGSAP || !hasST || prefersReducedMotion) return;

    const targets = $$(
      ".section-head, .map-wrap, .card, .landmark, .stat, .transit-block, .skills-network, .cluster, .tower, .comms-actions"
    );
    targets.forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 26,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });

    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  function heroIntro() {
    if (!hasGSAP || prefersReducedMotion) return;
    gsap.from(".hero-inner > *", { opacity: 0, y: 22, duration: 0.8, ease: "power3.out", stagger: 0.09 });
    gsap.from("#hud", { opacity: 0, x: 16, duration: 0.8, delay: 0.55, ease: "power3.out" });
  }

  /* ---------- init ---------- */

  initPower();
  setupYear();
  progress();
  bolt();
  sectionSpy();
  hud();
  heroGrid();
  cityMap();
  transit();
  skillsNetwork();
  modals();
  reveals();

  runBoot().then(() => heroIntro());
})();
