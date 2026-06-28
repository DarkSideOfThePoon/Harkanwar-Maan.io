// Portfolio interactions
// ----------------------

window.addEventListener("DOMContentLoaded", () => {
  const smoothWrapper = document.getElementById("smooth-wrapper");
  const smoothContent = document.getElementById("smooth-content");
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (hasGSAP && hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  function useNativeScroll() {
    if (smoothWrapper) {
      smoothWrapper.style.position = "static";
      smoothWrapper.style.overflow = "visible";
    }
    if (smoothContent) {
      smoothContent.style.transform = "none";
    }
    document.body.style.height = "auto";
  }

  function initSmoothScroll() {
    if (prefersReducedMotion || !hasGSAP || !hasScrollTrigger || !smoothWrapper || !smoothContent) {
      useNativeScroll();
      return;
    }

    let contentHeight = 0;
    let currentScroll = 0;
    let targetScroll = 0;
    const ease = 0.12;

    const setBodyHeight = () => {
      contentHeight = smoothContent.getBoundingClientRect().height;
      document.body.style.height = `${contentHeight}px`;
    };

    setBodyHeight();

    window.addEventListener("resize", () => {
      setBodyHeight();
      ScrollTrigger.refresh();
    }, { passive: true });

    window.addEventListener("scroll", () => {
      targetScroll = window.scrollY || window.pageYOffset;
    }, { passive: true });

    gsap.ticker.add(() => {
      currentScroll += (targetScroll - currentScroll) * ease;
      gsap.set(smoothContent, { y: -currentScroll });
    });
  }

  function setupYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function setupSectionReveals() {
    if (prefersReducedMotion || !hasGSAP || !hasScrollTrigger) return;

    document.querySelectorAll(".section-padded, .hero").forEach((section) => {
      section.classList.add("section-reveal");
      gsap.to(section, {
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          once: true
        },
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: "power3.out"
      });
    });
  }

  function setupSkillsRadar() {
    const shape = document.getElementById("radar-shape");
    const dots = document.getElementById("radar-dots");
    if (!shape || !dots) return;

    // Single source of truth for the five axes (order matches the
    // radar-label elements, clockwise from top).
    const axes = [
      { label: "Services Engineering", value: 88 },
      { label: "Software & Automation", value: 76 },
      { label: "Data & Python", value: 90 },
      { label: "Hardware & Systems", value: 72 },
      { label: "Site Workflows", value: 84 }
    ];
    const values = axes.map((a) => a.value);
    const total = values.length;

    const toPoints = (vals) => vals.map((value, index) => {
      const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
      const radius = (value / 100) * 100;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const render = (vals) => {
      const points = toPoints(vals);
      shape.setAttribute("points", points.join(" "));
      dots.innerHTML = points.map((point) => {
        const [x, y] = point.split(",");
        return `<circle cx="${x}" cy="${y}" r="3.5"></circle>`;
      }).join("");
    };

    if (prefersReducedMotion || !hasGSAP) {
      // No animation: paint the final shape and stop.
      render(values);
      return;
    }

    // Paint at zero so the grow-in animation starts from an empty centre
    // (avoids a full -> zero -> full flash).
    render(values.map(() => 0));

    const animate = () => {
      // Tween a proxy whose numeric keys GSAP CAN interpolate (it can't
      // tween an array value). Read those keys back on each update.
      const proxy = {};
      values.forEach((_, i) => { proxy["a" + i] = 0; });

      const target = {};
      values.forEach((v, i) => { target["a" + i] = v; });

      gsap.to(proxy, {
        ...target,
        duration: 1.25,
        ease: "power2.out",
        onUpdate() {
          render(values.map((_, i) => proxy["a" + i]));
        }
      });
    };

    if (hasScrollTrigger) {
      ScrollTrigger.create({
        trigger: "#section-skills",
        start: "top 72%",
        once: true,
        onEnter: animate
      });
    } else {
      animate();
    }
  }

  function setupScrollProgress() {
    const bar = document.getElementById("scroll-progress-bar");
    if (!bar) return;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  function setupHeroMotion() {
    const hero = document.getElementById("section-hero");
    const pointerFine = window.matchMedia("(pointer: fine)").matches;
    if (prefersReducedMotion || !hasGSAP || !hero || !pointerFine) return;

    const targets = {
      ".hero-title": 6,
      ".hero-subtitle": 10,
      ".hero-panel": 8,
      ".hero-orbit": 14
    };

    const applyParallax = (xPercent, yPercent) => {
      Object.entries(targets).forEach(([selector, strength]) => {
        gsap.to(selector, {
          x: xPercent * strength,
          y: yPercent * strength,
          duration: 0.55,
          ease: "power2.out"
        });
      });
    };

    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      const xPercent = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const yPercent = (event.clientY - rect.top - rect.height / 2) / rect.height;
      applyParallax(xPercent, yPercent);
    });

    hero.addEventListener("mouseleave", () => applyParallax(0, 0));

    gsap.to(".hero-orbit", {
      y: -10,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".orbit-dot-1", { x: 6, y: -4, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".orbit-dot-2", { x: -4, y: 3, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".orbit-dot-3", { x: 5, y: 5, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }

  function setupProjectModals() {
    const overlay = document.getElementById("modal-overlay");
    const modal = document.getElementById("modal");
    const titleEl = document.getElementById("modal-title");
    const descEl = document.getElementById("modal-desc");
    const tagEl = document.getElementById("modal-tag");
    const stackEl = document.getElementById("modal-stack");
    const closeBtn = document.getElementById("modal-close");
    if (!overlay || !modal || !titleEl || !descEl) return;

    let lastFocusedCard = null;

    const openModal = (card) => {
      lastFocusedCard = card;
      let data = {};
      try {
        data = JSON.parse(card.dataset.project || "{}");
      } catch (error) {
        data = {};
      }

      titleEl.textContent = data.title || card.querySelector("h3")?.textContent || "Project";
      descEl.textContent = data.desc || card.querySelector("p")?.textContent || "";
      tagEl.textContent = data.tag || "Project";
      stackEl.textContent = data.stack || "";

      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      closeBtn?.focus();

      if (hasGSAP && !prefersReducedMotion) {
        gsap.fromTo(modal, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.28, ease: "power2.out" });
      } else {
        modal.style.opacity = 1;
        modal.style.transform = "scale(1)";
      }
    };

    const closeModal = () => {
      const finish = () => {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        if (lastFocusedCard) lastFocusedCard.focus();
      };

      if (hasGSAP && !prefersReducedMotion) {
        gsap.to(modal, { opacity: 0, scale: 0.96, duration: 0.2, ease: "power2.in", onComplete: finish });
      } else {
        finish();
      }
    };

    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => openModal(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(card);
        }
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal();
    });

    closeBtn?.addEventListener("click", closeModal);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });
  }

  function setupHorizontalScroll() {
    const track = document.getElementById("horizontal-track");
    if (prefersReducedMotion || !track || !hasGSAP || !hasScrollTrigger) return;

    // Distance the track must travel so its last panel ends flush in view.
    const getDistance = () => Math.max(0, track.scrollWidth - track.parentElement.offsetWidth);

    gsap.to(track, {
      x: () => -getDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: "#projects-horizontal",
        start: "top top",
        end: () => `+=${getDistance()}`,
        scrub: true,
        pin: true,
        // pin via transform so pinning works inside the transformed
        // smooth-scroll content wrapper instead of fighting it.
        pinType: "transform",
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  }

  function setupThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const storageKey = "shark-theme";

    const applyTheme = (mode) => {
      const isLight = mode === "light";
      document.body.classList.toggle("theme-light", isLight);
      toggle.classList.toggle("is-light", isLight);
      toggle.setAttribute("aria-pressed", String(isLight));
    };

    const saved = localStorage.getItem(storageKey);
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(saved || (prefersLight ? "light" : "dark"));

    toggle.addEventListener("click", () => {
      const next = document.body.classList.contains("theme-light") ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem(storageKey, next);
    });
  }

  initSmoothScroll();
  setupYear();
  setupThemeToggle();
  setupSectionReveals();
  setupScrollProgress();
  setupHeroMotion();
  setupSkillsRadar();
  setupProjectModals();
  setupHorizontalScroll();
});
