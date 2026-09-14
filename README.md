# eli-vannelli-sitio

Sitio del emprendimiento de Eli Vannelli (terapias, llaves de trabajo interior,
celebraciones y oráculos propios). Generador estático propio, en Node puro,
sin frameworks ni dependencias — clonás el repo, corrés un comando, y tenés
el sitio listo en `/docs`.

## Por qué está armado así

Es un generador de sitio estático (SSG) casero: vos editás **datos** (archivos
`.json`) y un script (`build.js`) arma el HTML final. Nunca se edita el HTML
de las páginas de detalle a mano — se regeneran solas. Esto es lo mismo que
hacen herramientas como Eleventy o Astro por debajo, pero sin la curva de
aprendizaje ni las dependencias, porque el contenido es simple y no vale la
pena traer un framework para esto.

```
data/
  config.json          → contacto, redes, WhatsApp
  flagship.json         → "El Sendero a tu Corazón" (espacio insignia)
  llaves.json            → Sendero 22, Luz Interior, Tarot Terapéutico
  celebraciones.json     → Celebrando tu Vida (y las que se sumen)
  oraculos.json          → Mandalas de Fuego, Hadas Bienaventuradas, Primeros Pasos
templates/               → HTML con placeholders {{ASI}}, reutilizado por build.js
css/, js/, images/       → assets fuente
build.js                 → el generador. `node build.js` lo corre.
docs/                    → salida generada (esto es lo que se publica)
```

`docs/` se sube al repo tal cual — no hace falta build en el servidor.
GitHub Pages y Netlify sirven archivos estáticos directo desde ahí.

### Carrito de compras

Solo los **oráculos** (productos físicos) tienen botón "Agregar al carrito" —
las llaves, celebraciones y el espacio insignia son servicios/sesiones y se
coordinan directo por WhatsApp, sin pasar por el carrito. El carrito vive
enteramente en el navegador (localStorage, sin backend ni pasarela de pago):
al finalizar, arma un mensaje de WhatsApp con el detalle del pedido y el
total. Su catálogo (`window.PRODUCTS`) se genera automático desde
`data/oraculos.json` en cada build — no se edita a mano.

## Editar contenido

1. Abrí el `.json` que corresponda en `data/`.
2. Cambiá texto, precio, `modalidad`, `duracion`, `incluye`, `pago`, etc.
3. Corré:
   ```
   node build.js
   ```
4. Listo — `docs/` se regenera entero (páginas de inicio, listados y el
   detalle de cada llave/celebración/oráculo).

### Agregar una llave, celebración u oráculo nuevo

Copiá un objeto dentro del array del `.json` correspondiente y completá sus
campos. Como mínimo necesita `slug` (usá minúsculas y guiones, sin tildes),
`nombre`, `resumen`, `descripcion` (array de párrafos) y `precio`. Si no hay
imagen todavía, dejá `imagen` sin ese campo — la página se acomoda sola a una
columna en vez de romperse.

Campos opcionales por item: `modalidad`, `duracion`, `incluye`, `pago`,
`imagen` (foto de la página de detalle), `portada` (miniatura para las
tarjetas de listado — si no está, se usa `imagen` también ahí), `imagenAlt`,
`galeria` (array de imágenes adicionales), `borrador: true` (marca
visualmente que el texto todavía no está confirmado).

### WhatsApp e Instagram/TikTok

Están en `data/config.json`. El número de WhatsApp va en formato
internacional sin espacios ni `+` (`598` + número sin el 0 inicial).

## Publicar gratis

Tenés dos opciones. Cualquiera de las dos sirve — Netlify es más simple para
publicar rápido, GitHub Pages tiene más sentido si esto va a ser parte de tu
portfolio como desarrollador (el repo queda público, con commits, prolijo).

### Opción A — GitHub Pages (recomendada para portfolio)

1. Creá un repositorio nuevo en GitHub (público, si querés que se vea en tu
   portfolio): botón **New repository**. No lo inicialices con README —ya
   tenés uno acá.
2. En tu máquina, dentro de esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Sitio de Eli Vannelli: generador estático + contenido"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/eli-vannelli-sitio.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages**. En "Build and deployment", elegí
   **Deploy from a branch**, rama `main`, carpeta **`/docs`**. Guardar.
4. En un minuto te da la URL:
   `https://<tu-usuario>.github.io/eli-vannelli-sitio/`
5. De ahí en más, cada vez que cambies contenido: editás el `.json`, corrés
   `node build.js`, y:
   ```bash
   git add .
   git commit -m "Actualiza contenido"
   git push
   ```
   GitHub Pages se actualiza solo con cada push.

Como es un repo real con historial de commits y un build system propio (no
solo HTML suelto), sirve perfecto como pieza de portfolio: mostrás que sabés
armar herramientas, no solo maquetar.

Si más adelante querés dominio propio (ej. `elivannelli.com`), en el mismo
menú de Pages hay un campo "Custom domain" — te paso los pasos de DNS cuando
lleguen a esa parte.

### Opción B — Netlify (la más rápida)

1. Andá a https://app.netlify.com/drop
2. Arrastrá la carpeta **`docs`** (solo esa, no todo el repo) a la página.
3. En segundos da una URL tipo `nombre-al-azar.netlify.app`, con HTTPS.
4. **Site settings → Change site name** para algo como `elivannelli.netlify.app`.
5. Cada vez que cambies contenido, volvés a arrastrar la carpeta `docs`
   actualizada (o conectás el repo de GitHub desde Netlify para que se
   despliegue solo en cada push — te lo configuro si preferís esa opción).

## Agenda (Cal.com)

Ya está conectada. Cada llave y la celebración tienen su link de Cal.com en
el campo `calLink` dentro de `data/llaves.json` y `data/celebraciones.json`
— aparecen como botón "Reservar turno" en su página y en la sección Agenda
del home. Para sumar un link a un ítem nuevo, agregale ese campo con la URL
del tipo de evento en Cal.com y corré `node build.js`.

## Sumar un testimonio (sin tocar código)

Abrí `data/testimonios.txt` con cualquier editor de texto. Es una lista de
bloques separados por una línea que dice `===`. Para sumar uno nuevo, copiá
este bloque al final del archivo y completalo:

```
Nombre: (el nombre de la persona)
Sobre: (opcional — el nombre de una llave, celebración u oráculo, tal cual
       aparece en el sitio, ej. "Sendero 22" o "Lectura Tu Mundo". Si no
       aplica, borrá esta línea entera)
Foto: (opcional — el nombre del archivo si le subiste una foto a esa
      persona a la carpeta images/, ej. andrea.jpg. Si no tiene, borrá
      esta línea)
Texto: (el mensaje de la persona, puede ocupar varias líneas)

===
```

No hace falta ningún signo especial (nada de comillas, comas ni llaves —
eso era lo que podía romperse editando el `.json` a mano). Guardá el
archivo y corré:

```
node build.js
```

Con eso ya se regeneró `docs/` con el testimonio nuevo adentro. Después,
los mismos cuatro comandos de git de siempre (`add`, `commit`, `pull`, `push`).

**Para que esto funcione sin pedirme nada**, necesitás tener Node
instalado en tu computadora (lo más probable es que ya lo tengas, porque
es lo mismo que usás para correr los comandos de git — si `node build.js`
te tira "command not found", avisame y lo instalamos juntas, es rápido).

### Sumarle una foto a un testimonio

1. Poné el archivo de imagen directo en la carpeta `images/` (no hace
   falta ninguna subcarpeta especial).
2. En el bloque de esa persona en `testimonios.txt`, agregá la línea
   `Foto: nombre-del-archivo.jpg` (el nombre exacto del archivo que
   pusiste en el paso 1).
3. `node build.js` y los comandos de git de siempre.

### Reemplazar una foto que ya existe en el sitio

Esto también lo podés hacer siempre vos sola, sin pedírmelo: si guardás
un archivo nuevo con el **mismo nombre exacto** que uno que ya está en
`images/` (por ejemplo, volver a guardar `tarot-terapeutico.jpg`
pisando el que ya existe), `node build.js` copia automáticamente la
versión nueva a `docs/images/` — no hace falta tocar esa carpeta a mano.
Antes estabas reemplazando el archivo pero sin correr `node build.js`,
por eso `docs/` se quedaba con la foto vieja aunque hicieras el push.

- **Mandalas de Fuego**: la descripción del oráculo (`data/oraculos.json`,
  campo `descripcion`) la redacté yo a partir de las fotos del mazo —
  quedó marcada con `"borrador": true`. Convendría que Eli la revise.
