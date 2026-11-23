# eli-vannelli-sitio

Sitio del emprendimiento de Eli Vannelli (terapias, llaves de trabajo interior,
celebraciones y oráculos propios). Generador estático propio, en Node puro,
sin frameworks ni dependencias.

## Por qué está armado así

Es un generador de sitio estático (SSG) casero: uno edita **datos** (archivos
`.json`) y un script (`build.js`) arma el HTML final. Nunca se edita el HTML
de las páginas de detalle a mano — se regeneran solas.

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



## Pendiente / a confirmar con Eli

- **Mandalas de Fuego**: la descripción del oráculo (`data/oraculos.json`,
  campo `descripcion`) la redacté yo a partir de las fotos del mazo —
  quedó marcada con `"borrador": true`. Convendría que Eli la revise.
