// Smooth inertia scrolling using GSAP (kept intact)
// -------------------------------------------------

const smoothWrapper = document.getElementById("smooth-wrapper");
const smoothContent = document.getElementById("smooth-content");
const hasGSAP = typeof window.gsap !== "undefined";
const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";

if (hasGSAP && hasScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

function initSmoothScroll() {
  if (!hasGSAP || !hasScrollTrigger || !smoothWrapper || !smoothContent) {
    if (smoothWrapper) {
      smoothWrapper.style.position = "static";
      smoothWrapper.style.overflow = "visible";
    }
    console.warn("GSAP/ScrollTrigger missing; fallback to native scroll.");
    return;
  }

  let contentHeight;
  let currentScroll = 0;
  let targetScroll = 0;
  const ease = 0.12;

  const setBodyHeight = () => {
    contentHeight = smoothContent.getBoundingClientRect().height;
    document.body.style.height = contentHeight + "px";
  };

  setBodyHeight();
  window.addEventListener("resize", () => {
    setBodyHeight();
    ScrollTrigger.refresh();
  });

  window.addEventListener("scroll", () => {
    targetScroll = window.scrollY || window.pageYOffset;
  });

  gsap.ticker.add(() => {
    currentScroll += (targetScroll - currentScroll) * ease;
    gsap.set(smoothContent, { y: -currentScroll });
  });
}

initSmoothScroll();

// Simple year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Scroll-triggered reveals
function setupSectionReveals() {
  if (!hasScrollTrigger) return;
  const sections = document.querySelectorAll(".section-padded, .hero");

  sections.forEach((sec) => {
    sec.classList.add("section-reveal");

    gsap.to(sec, {
      scrollTrigger: {
        trigger: sec,
        start: "top 80%",
        end: "bottom 40%",
        scrub: false
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    });
  });
}

// Skills radar animation (triggered on view)
function setupSkillsRadar() {
  const shape = document.getElementById("radar-shape");
  const dots = document.getElementById("radar-dots");
  if (!shape || !dots || !hasGSAP) return;

  // Five-point radar values (0-100)
  const categories = [
    { label: "Services Engineering", value: 85 },
    { label: "Software Development", value: 75 },
    { label: "Automation & Scripting", value: 90 },
    { label: "Data & Simulation", value: 70 },
    { label: "Construction Workflows", value: 80 }
  ];

  const total = categories.length;

  const toPoints = (vals) => vals.map((val, i) => {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = (val / 100) * 100;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    return `${x},${y}`;
  });

  const render = (vals) => {
    const points = toPoints(vals);
    shape.setAttribute("points", points.join(" "));
    dots.innerHTML = points.map((pt) => {
      const [x, y] = pt.split(",");
      return `<circle cx="${x}" cy="${y}" r="3.5"></circle>`;
    }).join("");
  };

  const animate = () => {
    const tl = gsap.timeline();
    tl.fromTo(
      { vals: categories.map(() => 0) },
      {
        vals: categories.map((c) => c.value),
        duration: 1.4,
        ease: "power2.out",
        onUpdate: function () { render(this.targets()[0].vals); }
      }
    );
  };

  if (hasScrollTrigger) {
    ScrollTrigger.create({
      trigger: "#skills",
      start: "top 70%",
      once: true,
      onEnter: animate
    });
  } else {
    animate();
  }
}

// Directional drift on scroll (non-linear feel)
function setupDirectionalDrift() {
  if (!hasScrollTrigger) return;
  const sections = document.querySelectorAll(".section");

  sections.forEach((sec, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const offsetX = 140 * direction;
    const tilt = 1.5 * direction;

    gsap.fromTo(
      sec,
      { x: offsetX, rotation: tilt },
      {
        x: 0,
        rotation: 0,
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  });
}

// Scroll progress bar
function setupScrollProgress() {
  const bar = document.getElementById("scroll-progress-bar");
  if (!bar) return;

  if (hasScrollTrigger) {
    ScrollTrigger.create({
      start: 0,
      end: () => document.body.scrollHeight - window.innerHeight,
      onUpdate: (self) => {
        bar.style.width = `${self.progress * 100}%`;
      }
    });
  } else {
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = (window.scrollY / max) * 100;
      bar.style.width = `${pct}%`;
    });
  }
}

// Hero parallax (mouse) + idle motion
function setupHeroParallax() {
  const hero = document.getElementById("section-hero");
  if (!hero || !hasGSAP) return;

  const targets = {
    ".hero-title": 8,
    ".hero-subtitle": 12,
    ".hero-orbit": 16
  };

  const applyParallax = (xPercent, yPercent) => {
    Object.entries(targets).forEach(([selector, strength]) => {
      gsap.to(selector, {
        x: xPercent * strength,
        y: yPercent * strength,
        duration: 0.6,
        ease: "power2.out"
      });
    });
  };

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const yPercent = (e.clientY - rect.top - rect.height / 2) / rect.height;
    applyParallax(xPercent, yPercent);
  });

  hero.addEventListener("mouseleave", () => applyParallax(0, 0));

  // Idle float for orbit/dots
  gsap.to(".hero-orbit", {
    y: -10,
    duration: 2.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".orbit-dot-1", {
    x: 6,
    y: -4,
    scale: 1.02,
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".orbit-dot-2", {
    x: -4,
    y: 3,
    duration: 5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".orbit-dot-3", {
    x: 5,
    y: 5,
    duration: 3.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
}

// Project modal popups
function setupProjectModals() {
  const overlay = document.getElementById("modal-overlay");
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("modal-title");
  const descEl = document.getElementById("modal-desc");
  const imageEl = document.getElementById("modal-image");
  const closeBtn = document.getElementById("modal-close");
  if (!overlay || !modal) return;

  const openModal = (data) => {
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    imageEl.src = data.image;
    imageEl.alt = `${data.title} visual`;
    overlay.style.display = "flex";

    if (hasGSAP) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
      );
    } else {
      modal.style.opacity = 1;
      modal.style.transform = "scale(1)";
    }
  };

  const closeModal = () => {
    if (hasGSAP) {
      gsap.to(modal, {
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          overlay.style.display = "none";
        }
      });
    } else {
      overlay.style.display = "none";
    }
  };

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      const data = card.dataset.project ? JSON.parse(card.dataset.project) : {
        title: card.querySelector("h3")?.textContent || "Project",
        desc: card.querySelector("p")?.textContent || "",
        image: ""
      };
      openModal(data);
    });
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  closeBtn?.addEventListener("click", closeModal);
}

// Horizontal scroll showcase
function setupHorizontalScroll() {
  const track = document.getElementById("horizontal-track");
  if (!track || !hasScrollTrigger) return;

  const panels = gsap.utils.toArray(".horizontal-panel");
  const totalWidth = track.scrollWidth;
  const distance = totalWidth - window.innerWidth;

  gsap.to(track, {
    x: () => -distance,
    ease: "none",
    scrollTrigger: {
      trigger: "#projects-horizontal",
      start: "top top",
      end: () => `+=${totalWidth}`,
      scrub: true,
      pin: true,
      anticipatePin: 1
    }
  });

  // refresh when viewport resizes
  window.addEventListener("resize", () => ScrollTrigger.refresh(), { passive: true });
}

// Light / dark theme toggle
function setupThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  const body = document.body;
  const storageKey = "shark-theme";

  const applyTheme = (mode) => {
    body.classList.toggle("theme-light", mode === "light");
    toggle.classList.toggle("is-light", mode === "light");
  };

  const saved = localStorage.getItem(storageKey);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = saved || (prefersLight ? "light" : "dark");
  applyTheme(initial);

  toggle.addEventListener("click", () => {
    const next = body.classList.contains("theme-light") ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(storageKey, next);
    if (hasGSAP) {
      gsap.fromTo(body, { opacity: 0.92 }, { opacity: 1, duration: 0.25, ease: "power1.out" });
    }
  });
}

// Init gated by GSAP
if (hasGSAP) {
  if (hasScrollTrigger) {
    setupSectionReveals();
    setupDirectionalDrift();
    setupHorizontalScroll();
  }
  setupScrollProgress();
  setupHeroParallax();
  setupProjectModals();
  setupSkillsRadar();
  setupThemeToggle();
} else {
  // Fallbacks
  setupScrollProgress();
  setupProjectModals();
  setupThemeToggle();
}
