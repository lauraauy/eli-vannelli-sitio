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

// ---------- datos ----------

const config = readJSON(path.join(ROOT, "data/config.json"));
const flagship = readJSON(path.join(ROOT, "data/flagship.json"));
const llaves = readJSON(path.join(ROOT, "data/llaves.json"));
const celebraciones = readJSON(path.join(ROOT, "data/celebraciones.json"));
const oraculos = readJSON(path.join(ROOT, "data/oraculos.json"));

const COLLECTIONS = {
  llaves: {
    items: llaves,
    kicker: "Llave",
    backLabel: "Todas las llaves",
    titulo: "Las Llaves",
    bajada: "Herramientas integrativas para abrir el camino hacia tu interior.",
    emptyMsg: "Muy pronto vas a encontrar acá más llaves.",
    otrosTitulo: "Otras llaves",
  },
  celebraciones: {
    items: celebraciones,
    kicker: "Celebración",
    backLabel: "Todas las celebraciones",
    titulo: "Rituales para marcar tus momentos",
    bajada: "Encuentros grupales y ceremonias para celebrar la vida en compañía de tu tribu.",
    emptyMsg: "Muy pronto vas a encontrar acá más celebraciones.",
    otrosTitulo: "Otras celebraciones",
  },
  oraculos: {
    items: oraculos,
    kicker: "Oráculo",
    backLabel: "Todos los oráculos",
    titulo: "Cartas canalizadas para iluminar tu camino",
    bajada: "Cada oráculo nace de un proceso propio de canalización, pensado para acompañar momentos concretos del camino de quien consulta.",
    emptyMsg: "Muy pronto vas a encontrar acá los oráculos propios de Eli.",
    otrosTitulo: "Otros oráculos",
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

function renderPage(outFile, { title, description, content }) {
  const html = fill(baseTpl, {
    TITLE: title,
    DESCRIPTION: description,
    CSS_HREF: relTo(outFile, path.join(DIST, "css/style.css")),
    JS_HREF: relTo(outFile, path.join(DIST, "js/site.js")),
    HOME_HREF: relTo(outFile, path.join(DIST, "index.html")),
    SOBREMI_HREF: relTo(outFile, path.join(DIST, "index.html")) + "#sobre-mi",
    LLAVES_HREF: relTo(outFile, path.join(DIST, "llaves/index.html")),
    CELEBRACIONES_HREF: relTo(outFile, path.join(DIST, "celebraciones/index.html")),
    ORACULOS_HREF: relTo(outFile, path.join(DIST, "oraculos/index.html")),
    TIENDA_HREF: relTo(outFile, path.join(DIST, "index.html")) + "#tienda",
    AGENDA_HREF: relTo(outFile, path.join(DIST, "index.html")) + "#agenda",
    INSTAGRAM_URL: config.instagram,
    INSTAGRAM_HANDLE: config.instagramHandle,
    TIKTOK_URL: config.tiktok,
    TIKTOK_HANDLE: config.tiktokHandle,
    WHATSAPP_FOOTER_URL: whatsappUrl("Hola Eli! Quisiera hacerte una consulta."),
    LOCATION: config.location,
    CONTENT: content,
  });
  writeFile(outFile, html);
}

function serviceCard(item, outFile, { withPrice = false, detailDir }) {
  const detailHref = relTo(outFile, path.join(DIST, detailDir, item.slug, "index.html"));
  const priceBlock = withPrice
    ? `<p class="service-price">${item.precio}</p>
       ${item.pago ? `<p class="service-pago">Pagos: ${item.pago}</p>` : ""}
       <a class="btn btn-primary" href="${whatsappUrl(`Hola Eli! Quisiera consultar por: ${item.nombre}.`)}" target="_blank" rel="noopener">Pedir por WhatsApp</a>`
    : `<a class="btn btn-ghost" href="${detailHref}">Ver más</a>`;
  return `
    <article class="service-card reveal">
      <h3><a href="${detailHref}" style="text-decoration:none;color:inherit;">${item.nombre}</a></h3>
      <p>${item.resumen}</p>
      ${metaHtml(item)}
      ${priceBlock}
    </article>`;
}

function buildDetailPages(key) {
  const coll = COLLECTIONS[key];
  coll.items.forEach((item) => {
    const outFile = path.join(DIST, key, item.slug, "index.html");
    const img = imageBlock(item, outFile);

    const otros = coll.items.filter((x) => x.slug !== item.slug);
    const otrosCards = otros.map((x) => serviceCard(x, outFile, { withPrice: false, detailDir: key })).join("\n");

    const content = fill(detailContentTpl, {
      BACK_HREF: relTo(outFile, path.join(DIST, key, "index.html")),
      BACK_LABEL: coll.backLabel,
      KICKER: coll.kicker,
      NOMBRE: item.nombre,
      RESUMEN: item.resumen,
      IMAGE_BLOCK: img.html,
      GRID_CLASS: img.gridClass,
      DESCRIPCION_HTML: descripcionHtml(item),
      META_HTML: metaHtml(item),
      PRECIO: item.precio || "Consultar valor",
      PAGO_LINE: item.pago ? `<p class="service-pago">Pagos: ${item.pago}</p>` : "",
      WHATSAPP_URL: whatsappUrl(`Hola Eli! Quisiera consultar por: ${item.nombre}.`),
      OTROS_TITULO: coll.otrosTitulo,
      OTROS_CARDS: otrosCards || `<p style="text-align:center;">Muy pronto vas a encontrar más acá.</p>`,
    });

    renderPage(outFile, { title: `${item.nombre} — Eli Vannelli`, description: item.resumen, content });
  });
}

function buildListingPage(key) {
  const coll = COLLECTIONS[key];
  const outFile = path.join(DIST, key, "index.html");
  const cards = coll.items.map((item) => serviceCard(item, outFile, { withPrice: true, detailDir: key })).join("\n");
  const emptyState = coll.items.length ? "" : `<div class="empty-state"><p>${coll.emptyMsg}</p></div>`;

  const content = fill(listingContentTpl, {
    BACK_HREF: relTo(outFile, path.join(DIST, "index.html")),
    KICKER: coll.titulo,
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
  const llavesCards = llaves.map((x) => serviceCard(x, outFile, { withPrice: false, detailDir: "llaves" })).join("\n");

  const content = fill(detailContentTpl, {
    BACK_HREF: relTo(outFile, path.join(DIST, "index.html")),
    BACK_LABEL: "Inicio",
    KICKER: "Espacio insignia",
    NOMBRE: flagship.nombre,
    RESUMEN: flagship.resumen,
    IMAGE_BLOCK: img.html,
    GRID_CLASS: img.gridClass,
    DESCRIPCION_HTML: descripcionHtml(flagship),
    META_HTML: metaHtml(flagship),
    PRECIO: flagship.precio || "Consultar valor",
    PAGO_LINE: flagship.pago ? `<p class="service-pago">Pagos: ${flagship.pago}</p>` : "",
    WHATSAPP_URL: whatsappUrl(`Hola Eli! Quisiera consultar por: ${flagship.nombre}.`),
    OTROS_TITULO: "Las llaves de este espacio",
    OTROS_CARDS: llavesCards,
  });

  renderPage(outFile, { title: `${flagship.nombre} — Eli Vannelli`, description: flagship.resumen, content });
}

function buildHome() {
  const outFile = path.join(DIST, "index.html");

  const llavesCards = llaves.map((t) => serviceCard(t, outFile, { withPrice: false, detailDir: "llaves" })).join("\n");
  const celebracionesCards = celebraciones.map((c) => serviceCard(c, outFile, { withPrice: false, detailDir: "celebraciones" })).join("\n");
  const oraculosCards = oraculos.map((o) => serviceCard(o, outFile, { withPrice: false, detailDir: "oraculos" })).join("\n");
  const oraculosEmpty = oraculos.length ? "" : `<div class="empty-state"><p>${COLLECTIONS.oraculos.emptyMsg}</p></div>`;

  const tiendaCards = [
    serviceCard(flagship, outFile, { withPrice: true, detailDir: "" }),
    ...llaves.map((t) => serviceCard(t, outFile, { withPrice: true, detailDir: "llaves" })),
    ...celebraciones.map((c) => serviceCard(c, outFile, { withPrice: true, detailDir: "celebraciones" })),
    ...oraculos.map((o) => serviceCard(o, outFile, { withPrice: true, detailDir: "oraculos" })),
  ].join("\n");

  const content = fill(indexContentTpl, {
    IMG_HERO: relTo(outFile, path.join(DIST, "images/hero-eli.jpg")),
    IMG_RETRATO: relTo(outFile, path.join(DIST, "images/eli-retrato.jpg")),
    IMG_FLAGSHIP: relTo(outFile, path.join(DIST, flagship.imagen)),
    FLAGSHIP_IMG_ALT: flagship.imagenAlt || flagship.nombre,
    FLAGSHIP_NOMBRE: flagship.nombre,
    FLAGSHIP_DESCRIPCION_HTML: descripcionHtml(flagship),
    FLAGSHIP_HREF: relTo(outFile, path.join(DIST, flagship.slug, "index.html")),
    LLAVES_HREF: relTo(outFile, path.join(DIST, "llaves/index.html")),
    AGENDA_HREF: "#agenda",
    LLAVES_CARDS: llavesCards,
    CELEBRACIONES_CARDS: celebracionesCards,
    ORACULOS_CARDS: oraculosCards + oraculosEmpty,
    TIENDA_CARDS: tiendaCards,
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
  console.log(`Listo. Generadas ${llaves.length} llaves, ${celebraciones.length} celebraciones y ${oraculos.length} oráculos (+1 espacio insignia) en /docs.`);
}

build();
