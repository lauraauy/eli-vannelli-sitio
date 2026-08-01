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

// =====================================================
// CARRITO — solo para productos físicos (oráculos)
// window.PRODUCTS, window.SITE_BASE y window.WHATSAPP_NUMBER
// los inyecta build.js en cada página (ver templates/base.html)
// =====================================================
const CART_KEY = "eliVannelliCart";

function cartRead() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function cartWrite(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    /* localStorage no disponible: el carrito no persiste, pero no rompe la página */
  }
}
function cartAdd(slug, qty = 1) {
  const cart = cartRead();
  cart[slug] = (cart[slug] || 0) + qty;
  cartWrite(cart);
  cartRender();
  cartOpen();
}
function cartSetQty(slug, qty) {
  const cart = cartRead();
  if (qty <= 0) delete cart[slug];
  else cart[slug] = qty;
  cartWrite(cart);
  cartRender();
}
function cartRemove(slug) {
  const cart = cartRead();
  delete cart[slug];
  cartWrite(cart);
  cartRender();
}
function cartClear() {
  cartWrite({});
  cartRender();
}
function productBySlug(slug) {
  return (window.PRODUCTS || []).find((p) => p.slug === slug);
}
function money(n) {
  return "$" + n.toLocaleString("es-UY");
}

function cartRender() {
  const cart = cartRead();
  const base = window.SITE_BASE || "";
  const itemsEl = document.getElementById("cartItems");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  const checkoutEl = document.getElementById("cartCheckout");
  if (!itemsEl) return;

  const slugs = Object.keys(cart).filter((s) => cart[s] > 0 && productBySlug(s));
  const count = slugs.reduce((sum, s) => sum + cart[s], 0);
  if (countEl) countEl.textContent = count;

  if (!slugs.length) {
    itemsEl.innerHTML = `<p class="cart-empty">Tu carrito está vacío.</p>`;
    if (totalEl) totalEl.textContent = money(0);
    if (checkoutEl) checkoutEl.setAttribute("aria-disabled", "true");
    return;
  }

  let total = 0;
  itemsEl.innerHTML = slugs
    .map((slug) => {
      const p = productBySlug(slug);
      const qty = cart[slug];
      const subtotal = p.precio * qty;
      total += subtotal;
      return `
        <div class="cart-item" data-slug="${slug}">
          <img src="${base}${p.imagen}" alt="${p.nombre}">
          <div class="cart-item-info">
            <p class="cart-item-name"><a href="${base}${p.href}">${p.nombre}</a></p>
            <p class="cart-item-price">${money(p.precio)} c/u</p>
            <div class="cart-item-qty">
              <button class="qty-btn" data-action="dec" aria-label="Restar">−</button>
              <span>${qty}</span>
              <button class="qty-btn" data-action="inc" aria-label="Sumar">+</button>
              <button class="cart-item-remove" data-action="remove" aria-label="Quitar">Quitar</button>
            </div>
          </div>
        </div>`;
    })
    .join("");

  if (totalEl) totalEl.textContent = money(total);
  if (checkoutEl) {
    checkoutEl.removeAttribute("aria-disabled");
    const lineas = slugs.map((slug) => {
      const p = productBySlug(slug);
      return `- ${p.nombre} x${cart[slug]} (${money(p.precio * cart[slug])})`;
    });
    const mensaje = `Hola Eli! Quisiera hacer este pedido:\n${lineas.join("\n")}\nTotal: ${money(total)}`;
    checkoutEl.href = `https://wa.me/${window.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  }
}

function cartOpen() {
  document.getElementById("cartDrawer")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("open");
}
function cartClose() {
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("open");
}

function bindCart() {
  if (!window.PRODUCTS) return;

  document.getElementById("cartButton")?.addEventListener("click", cartOpen);
  document.getElementById("cartClose")?.addEventListener("click", cartClose);
  document.getElementById("cartOverlay")?.addEventListener("click", cartClose);
  document.getElementById("cartClear")?.addEventListener("click", cartClear);

  // botones "Agregar al carrito" en cualquier tarjeta/página
  document.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cartAdd(btn.dataset.slug, 1);
    });
  });

  // +/- y quitar dentro del panel del carrito
  document.getElementById("cartItems")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest(".cart-item");
    const slug = row?.dataset.slug;
    if (!slug) return;
    const cart = cartRead();
    const current = cart[slug] || 0;
    if (btn.dataset.action === "inc") cartSetQty(slug, current + 1);
    if (btn.dataset.action === "dec") cartSetQty(slug, current - 1);
    if (btn.dataset.action === "remove") cartRemove(slug);
  });

  cartRender();
}

document.addEventListener("DOMContentLoaded", () => {
  bindNavToggle();
  bindScrollProgress();
  setYear();
  bindReveal();
  bindCart();
});
