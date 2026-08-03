#!/usr/bin/env node
/**
 * build.js — generador estático del sitio de Eli Vannelli.
 *
 * No usa dependencias externas (solo Node core) a propósito: cualquiera con
 * Node instalado puede clonar el repo y correr `node build.js` sin más.
 *
 * Qué hace:
 *  1. Lee data/config.json, data/flagship.json, data/llaves.json,
 *     data/celebraciones.json y data/oraculos.json
 *  2. Genera docs/index.html (home)
 *  3. Genera docs/el-sendero-a-tu-corazon/index.html (espacio insignia)
 *  4. Genera docs/<coleccion>/index.html + docs/<coleccion>/<slug>/index.html
 *     para llaves, celebraciones y oraculos
 *  5. Copia css/, js/ e images/ a docs/
 *
 * Editar contenido = editar los .json en /data y volver a correr `node build.js`.
 * No hace falta tocar HTML a mano.
 *
 * Carrito: solo los oráculos (productos físicos) tienen botón "Agregar al
 * carrito". Llaves, celebraciones y el espacio insignia son servicios/
 * sesiones y se coordinan directo por WhatsApp, sin pasar por el carrito.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "docs");

// ---------- utilidades ----------

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function readFile(p) {
  return fs.readFileSync(p, "utf8");
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function writeFile(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}
function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
function fill(tpl, map) {
  return tpl.replace(/{{(\w+)}}/g, (_, k) => (k in map && map[k] != null ? map[k] : ""));
}
function relTo(fromFile, toFileAbs) {
  let rel = path.relative(path.dirname(fromFile), toFileAbs);
  return rel.split(path.sep).join("/");
}
// convierte "$1.250" -> 1250 (formato uruguayo, punto de miles)
function numericPrice(precioStr) {
  if (!precioStr) return 0;
  const digits = String(precioStr).replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
// Íconos propios en línea (reemplazan los emojis genéricos por algo acorde
// a la identidad visual: llave antigua, copas para celebraciones, cartas de
// tarot para oráculos — nada de bola de cristal ni velita de emoji).
const ICONS = {
  llave: `<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="4.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 4.2v1.4M7 8.4v1.4M4.2 7h1.4M8.4 7h1.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="10" x2="19.3" y2="19.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 14.5l2-2M17 17l2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  celebracion: `<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3 L9 3 L7.2 8 C7.2 9 6.6 9.6 5.6 9.6 C4.6 9.6 4 9 4 8 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><line x1="5.6" y1="9.6" x2="5.6" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="3.8" y1="15" x2="7.4" y2="15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><g transform="rotate(18 16 9)"><path d="M13 3 L18 3 L16.2 8 C16.2 9 15.6 9.6 14.6 9.6 C13.6 9.6 13 9 13 8 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><line x1="14.6" y1="9.6" x2="14.6" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="12.8" y1="15" x2="16.4" y2="15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></g></svg>`,
  oraculo: `<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="11" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(-8 8.5 13)"/><rect x="10" y="5" width="11" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(8 15.5 13)"/><circle cx="15.5" cy="13" r="2.2" fill="none" stroke="currentColor" stroke-width="1.1" transform="rotate(8 15.5 13)"/></svg>`,
};

// título con ícono fusionado: "🔑 Llave Sendero 22" / "🕯️ Celebración Gratitud"
// (usa shortName si el item lo tiene, para no repetir nombres largos)
function displayTitle(item, key) {
  const label = item.shortName || item.nombre;
  if (key === "llaves") return `${ICONS.llave} Llave ${label}`;
  if (key === "celebraciones") return `${ICONS.celebracion} Celebración ${label}`;
  return item.nombre;
}

// ---------- datos ----------

const config = readJSON(path.join(ROOT, "data/config.json"));
const flagship = readJSON(path.join(ROOT, "data/flagship.json"));
const llaves = readJSON(path.join(ROOT, "data/llaves.json"));
const celebraciones = readJSON(path.join(ROOT, "data/celebraciones.json"));
const oraculos = readJSON(path.join(ROOT, "data/oraculos.json"));

const COLLECTIONS = {
  llaves: {
    items: llaves,
    kicker: "", // el ícono + "Llave" ahora va fusionado en el propio título (ver displayTitle)
    sectionEyebrow: ICONS.llave + " Llaves",
    backLabel: "Todas las llaves",
    titulo: "Las Llaves",
    bajada: "Herramientas integrativas para abrir el camino hacia tu interior.",
    emptyMsg: "Muy pronto vas a encontrar acá más llaves.",
    otrosTitulo: "Otras llaves",
    cta: "whatsapp",
  },
  celebraciones: {
    items: celebraciones,
    kicker: "",
    sectionEyebrow: ICONS.celebracion + " Celebraciones",
    backLabel: "Todas las celebraciones",
    titulo: "Rituales para marcar tus momentos",
    bajada: "Encuentros grupales y ceremonias para celebrar la vida en compañía de tu tribu.",
    emptyMsg: "Muy pronto vas a encontrar acá más celebraciones.",
    otrosTitulo: "Otras celebraciones",
    cta: "whatsapp",
  },
  oraculos: {
    items: oraculos,
    kicker: "Oráculo",
    sectionEyebrow: ICONS.oraculo + " Oráculos",
    backLabel: "Todos los oráculos",
    titulo: "Cartas canalizadas para iluminar tu camino",
    bajada: "Cada oráculo nace de un proceso propio de canalización, pensado para acompañar momentos concretos del camino de quien consulta.",
    emptyMsg: "Muy pronto vas a encontrar acá los oráculos propios de Eli.",
    otrosTitulo: "Otros oráculos",
    cta: "cart",
  },
};

const baseTpl = readFile(path.join(ROOT, "templates/base.html"));
const indexContentTpl = readFile(path.join(ROOT, "templates/index-content.html"));
const detailContentTpl = readFile(path.join(ROOT, "templates/detail-content.html"));
const listingContentTpl = readFile(path.join(ROOT, "templates/listing-content.html"));

function whatsappUrl(mensaje) {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
}

function metaHtml(item) {
  const rows = [];
  if (item.modalidad) rows.push(`💻 ${item.modalidad}`);
  if (item.duracion) rows.push(`⌛ ${item.duracion}`);
  if (item.incluye) rows.push(`📝 ${item.incluye}`);
  if (!rows.length) return "";
  return `<ul class="service-meta">${rows.map((r) => `<li>${r}</li>`).join("")}</ul>`;
}

function descripcionHtml(item) {
  const draft = item.borrador ? `<p class="draft-note">Texto a confirmar con Eli</p>` : "";
  return draft + item.descripcion.map((p) => `<p>${p}</p>`).join("\n");
}

function kickerHtml(text) {
  return text ? `<p class="eyebrow">${text}</p>` : "";
}

function imageBlock(item, outFile) {
  if (!item.imagen) return { html: "", gridClass: " page-content-grid--no-image" };
  const galeria =
    item.galeria && item.galeria.length
      ? `<div class="page-gallery">${item.galeria
          .map((g) => `<img src="${relTo(outFile, path.join(DIST, g))}" alt="${item.nombre}">`)
          .join("")}</div>`
      : "";
  const html = `<div class="page-image"><img src="${relTo(outFile, path.join(DIST, item.imagen))}" alt="${item.imagenAlt || item.nombre}">${galeria}</div>`;
  return { html, gridClass: "" };
}

// catálogo global de productos (solo oráculos) para el carrito, inyectado en cada página
const PRODUCTS_CATALOG = oraculos.map((o) => ({
  slug: o.slug,
  nombre: o.nombre,
  precio: numericPrice(o.precio),
  imagen: o.portada || o.imagen || "",
  href: `oraculos/${o.slug}/index.html`,
}));

function renderPage(outFile, { title, description, content }) {
  const homeHref = relTo(outFile, path.join(DIST, "index.html"));
  const baseDir = homeHref === "index.html" ? "" : homeHref.replace(/index\.html$/, "");
  const html = fill(baseTpl, {
    TITLE: title,
    DESCRIPTION: description,
    CSS_HREF: relTo(outFile, path.join(DIST, "css/style.css")),
    JS_HREF: relTo(outFile, path.join(DIST, "js/site.js")),
    HOME_HREF: homeHref,
    BASE_DIR: baseDir,
    PRODUCTS_JSON: JSON.stringify(PRODUCTS_CATALOG),
    WHATSAPP_NUMBER: config.whatsappNumber,
    SOBREMI_HREF: homeHref + "#sobre-mi",
    LLAVES_HREF: relTo(outFile, path.join(DIST, "llaves/index.html")),
    CELEBRACIONES_HREF: relTo(outFile, path.join(DIST, "celebraciones/index.html")),
    ORACULOS_HREF: relTo(outFile, path.join(DIST, "oraculos/index.html")),
    TIENDA_HREF: homeHref + "#tienda",
    AGENDA_HREF: homeHref + "#agenda",
    INSTAGRAM_URL: config.instagram,
    INSTAGRAM_HANDLE: config.instagramHandle,
    TIKTOK_URL: config.tiktok,
    TIKTOK_HANDLE: config.tiktokHandle,
    WHATSAPP_FOOTER_URL: whatsappUrl("Hola Eli! Quisiera hacerte una consulta."),
    LOCATION: config.location,
    CREATOR_NAME: config.creatorName,
    CREATOR_URL: config.creatorUrl,
    CONTENT: content,
  });
  writeFile(outFile, html);
}

// CTA de una tarjeta/página: "link" (Ver más), "whatsapp" (precio + WhatsApp)
// o "cart" (precio + agregar al carrito, solo productos físicos)
function ctaHtml(item, { mode, detailHref }) {
  if (mode === "cart") {
    return `<p class="service-price">${item.precio}</p>
      <button class="btn btn-primary btn-add-cart" data-slug="${item.slug}">Agregar al carrito</button>`;
  }
  if (mode === "whatsapp") {
    const calBtn = item.calLink
      ? `<a class="btn btn-ghost" href="${item.calLink}" target="_blank" rel="noopener">Reservar turno</a>`
      : "";
    return `<p class="service-price">${item.precio}</p>
      ${item.pago ? `<p class="service-pago">Pagos: ${item.pago}</p>` : ""}
      <div class="cta-row"><a class="btn btn-primary" href="${whatsappUrl(`Hola Eli! Quisiera consultar por: ${item.nombre}.`)}" target="_blank" rel="noopener">Pedir por WhatsApp</a>${calBtn}</div>`;
  }
  return `<a class="btn btn-ghost" href="${detailHref}">Ver más</a>`;
}

function serviceCard(item, outFile, { mode = "link", detailDir }) {
  const detailHref = relTo(outFile, path.join(DIST, detailDir, item.slug, "index.html"));
  const thumbSrc = item.portada || item.imagen;
  const thumb = thumbSrc
    ? `<a href="${detailHref}" class="service-card-thumb"><img src="${relTo(outFile, path.join(DIST, thumbSrc))}" alt="${item.imagenAlt || item.nombre}" loading="lazy"></a>`
    : "";
  return `
    <article class="service-card reveal">
      ${thumb}
      <div class="service-card-body">
        <h3><a href="${detailHref}" style="text-decoration:none;color:inherit;">${displayTitle(item, detailDir)}</a></h3>
        <p>${item.resumen}</p>
        ${metaHtml(item)}
        ${ctaHtml(item, { mode, detailHref })}
      </div>
    </article>`;
}

function buildDetailPages(key) {
  const coll = COLLECTIONS[key];
  coll.items.forEach((item) => {
    const outFile = path.join(DIST, key, item.slug, "index.html");
    const img = imageBlock(item, outFile);

    const otros = coll.items.filter((x) => x.slug !== item.slug);
    const otrosCards = otros.map((x) => serviceCard(x, outFile, { mode: "link", detailDir: key })).join("\n");

    const whatsappBtn = `<a class="btn btn-primary" href="${whatsappUrl(`Hola Eli! Quisiera consultar por: ${item.nombre}.`)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`;
    const calBtn = item.calLink
      ? `<a class="btn btn-ghost" href="${item.calLink}" target="_blank" rel="noopener">Reservar turno</a>`
      : "";
    const cta =
      coll.cta === "cart"
        ? `<button class="btn btn-primary btn-add-cart" data-slug="${item.slug}">Agregar al carrito</button>`
        : `<div class="cta-row">${whatsappBtn}${calBtn}</div>`;

    const content = fill(detailContentTpl, {
      BACK_HREF: relTo(outFile, path.join(DIST, key, "index.html")),
      BACK_LABEL: coll.backLabel,
      KICKER_HTML: kickerHtml(coll.kicker),
      NOMBRE: displayTitle(item, key),
      RESUMEN: item.resumen,
      IMAGE_BLOCK: img.html,
      GRID_CLASS: img.gridClass,
      DESCRIPCION_HTML: descripcionHtml(item),
      META_HTML: metaHtml(item),
      PRECIO: item.precio || "Consultar valor",
      PAGO_LINE: item.pago ? `<p class="service-pago">Pagos: ${item.pago}</p>` : "",
      CTA_HTML: cta,
      OTROS_TITULO: coll.otrosTitulo,
      OTROS_CARDS: otrosCards || `<p style="text-align:center;">Muy pronto vas a encontrar más acá.</p>`,
    });

    renderPage(outFile, { title: `${item.nombre} — Eli Vannelli`, description: item.resumen, content });
  });
}

function buildListingPage(key) {
  const coll = COLLECTIONS[key];
  const outFile = path.join(DIST, key, "index.html");
  const cards = coll.items.map((item) => serviceCard(item, outFile, { mode: coll.cta, detailDir: key })).join("\n");
  const emptyState = coll.items.length ? "" : `<div class="empty-state"><p>${coll.emptyMsg}</p></div>`;

  const content = fill(listingContentTpl, {
    BACK_HREF: relTo(outFile, path.join(DIST, "index.html")),
    KICKER: coll.sectionEyebrow,
    TITULO: coll.titulo,
    BAJADA: coll.bajada,
    CARDS: cards,
    EMPTY_STATE: emptyState,
  });

  renderPage(outFile, { title: `${coll.titulo} — Eli Vannelli`, description: coll.bajada, content });
}

function buildFlagshipPage() {
  const outFile = path.join(DIST, flagship.slug, "index.html");
  const img = imageBlock(flagship, outFile);
  const llavesCards = llaves.map((x) => serviceCard(x, outFile, { mode: "link", detailDir: "llaves" })).join("\n");

  const content = fill(detailContentTpl, {
    BACK_HREF: relTo(outFile, path.join(DIST, "index.html")),
    BACK_LABEL: "Inicio",
    KICKER_HTML: kickerHtml(""),
    NOMBRE: flagship.nombre,
    RESUMEN: flagship.resumen,
    IMAGE_BLOCK: img.html,
    GRID_CLASS: img.gridClass,
    DESCRIPCION_HTML: descripcionHtml(flagship),
    META_HTML: metaHtml(flagship),
    PRECIO: flagship.precio || "Consultar valor",
    PAGO_LINE: flagship.pago ? `<p class="service-pago">Pagos: ${flagship.pago}</p>` : "",
    CTA_HTML: `<a class="btn btn-primary" href="${whatsappUrl(`Hola Eli! Quisiera consultar por: ${flagship.nombre}.`)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`,
    OTROS_TITULO: "Las llaves de este espacio",
    OTROS_CARDS: llavesCards,
  });

  renderPage(outFile, { title: `${flagship.nombre} — Eli Vannelli`, description: flagship.resumen, content });
}

function buildHome() {
  const outFile = path.join(DIST, "index.html");

  const llavesCards = llaves.map((t) => serviceCard(t, outFile, { mode: "link", detailDir: "llaves" })).join("\n");
  const celebracionesCards = celebraciones.map((c) => serviceCard(c, outFile, { mode: "link", detailDir: "celebraciones" })).join("\n");
  const oraculosCards = oraculos.map((o) => serviceCard(o, outFile, { mode: "link", detailDir: "oraculos" })).join("\n");
  const oraculosEmpty = oraculos.length ? "" : `<div class="empty-state"><p>${COLLECTIONS.oraculos.emptyMsg}</p></div>`;

  // Tienda: solo productos físicos (oráculos), con carrito
  const tiendaCards = oraculos.map((o) => serviceCard(o, outFile, { mode: "cart", detailDir: "oraculos" })).join("\n");

  const agendaItems = [...llaves, ...celebraciones].filter((x) => x.calLink);
  const agendaLinks = agendaItems
    .map(
      (x) => `
      <a class="agenda-option" href="${x.calLink}" target="_blank" rel="noopener">
        <span>
          <span class="agenda-option-name">${x.nombre}</span>
          <span class="agenda-option-meta">${x.duracion || ""}</span>
        </span>
        <span class="agenda-option-cta">Reservar →</span>
      </a>`
    )
    .join("\n");

  const content = fill(indexContentTpl, {
    IMG_HERO: relTo(outFile, path.join(DIST, "images/hero-eli.jpg")),
    IMG_RETRATO: relTo(outFile, path.join(DIST, "images/eli-retrato.jpg")),
    IMG_FLAGSHIP: relTo(outFile, path.join(DIST, flagship.portada || flagship.imagen)),
    FLAGSHIP_IMG_ALT: flagship.imagenAlt || flagship.nombre,
    FLAGSHIP_NOMBRE: flagship.nombre,
    FLAGSHIP_DESCRIPCION_HTML: descripcionHtml(flagship),
    FLAGSHIP_HREF: relTo(outFile, path.join(DIST, flagship.slug, "index.html")),
    LLAVES_HREF: relTo(outFile, path.join(DIST, "llaves/index.html")),
    AGENDA_HREF: "#agenda",
    LLAVES_CARDS: llavesCards,
    LLAVES_EYEBROW: COLLECTIONS.llaves.sectionEyebrow,
    CELEBRACIONES_CARDS: celebracionesCards,
    CELEBRACIONES_EYEBROW: COLLECTIONS.celebraciones.sectionEyebrow,
    ORACULOS_CARDS: oraculosCards + oraculosEmpty,
    ORACULOS_EYEBROW: COLLECTIONS.oraculos.sectionEyebrow,
    TIENDA_CARDS: tiendaCards,
    TIENDA_EYEBROW: "🛒 Tienda",
    AGENDA_LINKS: agendaLinks,
    WHATSAPP_AGENDA_URL: whatsappUrl("Hola Eli! Quisiera coordinar una sesión contigo."),
  });

  renderPage(outFile, {
    title: "Eli Vannelli — Sabiduría de la Matriz de Agua",
    description: "Terapias emocionales, llaves de trabajo interior, celebraciones y oráculos propios con Eli Vannelli.",
    content,
  });
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  copyDir(path.join(ROOT, "css"), path.join(DIST, "css"));
  copyDir(path.join(ROOT, "js"), path.join(DIST, "js"));
  copyDir(path.join(ROOT, "images"), path.join(DIST, "images"));

  buildHome();
  buildFlagshipPage();
  for (const key of Object.keys(COLLECTIONS)) {
    buildListingPage(key);
    buildDetailPages(key);
  }

  const total = llaves.length + celebraciones.length + oraculos.length;
  console.log(`Listo. Generadas ${llaves.length} llaves, ${celebraciones.length} celebraciones y ${oraculos.length} oráculos (+1 espacio insignia) en /docs. Carrito con ${PRODUCTS_CATALOG.length} productos.`);
}

build();
