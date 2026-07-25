// Runtime del sitio — todo el contenido (textos, precios, links) se genera
// en build time desde build.js + /data/*.json. Este archivo solo maneja
// comportamiento de la interfaz.

function bindNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

function bindScrollProgress() {
  const bar = document.querySelector(".path-progress");
  if (!bar) return;
  const update = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100;
    bar.style.width = `${scrolled}%`;
  };
  document.addEventListener("scroll", update, { passive: true });
  update();
}

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

function bindReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  const showAll = () => items.forEach((i) => i.classList.add("is-visible"));
  if (!("IntersectionObserver" in window)) {
    showAll();
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((i) => obs.observe(i));
  // red de seguridad: si el observer no dispara por algún motivo, igual se muestra
  setTimeout(showAll, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  bindNavToggle();
  bindScrollProgress();
  setYear();
  bindReveal();
});
