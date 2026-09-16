# ADR-004 — CSP estricto en scripts, `style-src` abierto en producción

**Estado:** aceptado · **Fecha:** 2026-09-15 · **Implementación:**
`security.csp` en `astro.config.mjs`, vigilado por `npm run verify:electron`

## Contexto

`security.csp: true` de Astro firma con SHA-256 cada `<style>` y cada `<script>`
inline que salió del build, y `script-src` es la directiva que impide que una
respuesta hostil del agente ejecute código en la página. El problema es que el
resto del stack de UI —reka-ui, shadcn-vue, vue-sonner— vive de **atributos
`style=""`**, y un hash nunca cubre un atributo. Lo dice el propio Chromium al
negarlos:

```
Applying inline style violates the following Content Security Policy directive
'style-src 'self' 'sha256-…''. Either the 'unsafe-inline' keyword, a hash (…),
or a nonce (…) is required to enable inline execution. Note that hashes do not
apply to event handlers, style attributes and javascript: navigations unless the
'unsafe-hashes' keyword is present. The action has been blocked.
```

Y no son casos límite: el HTML que sale del SSR de `/settings` ya trae esos
atributos —`--reka-slider-thumb-transform: translateX(-50%)` en el pulgar del
`Slider`, `left: 0%; right: 65%` en su relleno, `pointer-events: none` en la capa
del `Select`, y el `--width` / `--offset-*` con el que vue-sonner apila sus
avisos—. Con la política por defecto se descartan al parsear el documento.

En dev nada de esto se ve: el CSP interfiere con el WebSocket de HMR de Vite y
está apagado a propósito. Es la clase de fallo que llega a producción sin que
ningún test lo haya rozado.

## Decisión

Mantener el CSP activado en producción y aflojar **una sola** directiva:

```js
csp: isDev ? false : {
  styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
}
```

- `script-src` sigue con `'self'` + hashes de Astro, sin ninguna excepción inline.
  Es el vector que ejecuta código; ese no se toca.
- `style-src` pasa a `'self' 'unsafe-inline'`. Al dar `resources` explícitas Astro
  deja de añadir `'self'` por defecto, así que hay que escribirlo; los hashes se
  retiran solos, porque con `'unsafe-inline'` presente el navegador los ignora.
- `checkOrigin: true` sigue activo y no se añadió ninguna directiva más: la
  superficie que emite Astro son `script-src` y `style-src`, y se tocó una de dos.

## Lo que se rechazó

- **`{ resource: "'unsafe-inline'", kind: 'attribute' }`** — la opción «quirúrgica»,
  y la primera elegida. Emite `style-src-attr 'unsafe-inline'`, tapa el parseo del
  atributo y deja `style-src` estricto… y sigue dando avisos: las escrituras del
  CSSOM en tiempo de ejecución (Vue posicionando el popper con variables
  `--reka-popper-*`) caen contra `style-src`. Medido: popper bien, dos avisos por
  carga. Una política que siempre avisa deja de ser una señal para nadie.
- **`csp: false`** — tiraría también `script-src`, que es lo único que separa un
  transcript inyectable de un XSRF con ejecución.
- **`'unsafe-hashes'`** — exigiría conocer en el build el valor de cada atributo,
  y los que calcula el navegador (`--reka-popper-anchor-width: 176px`) no existen
  hasta el layout.
- **`Content-Security-Policy-Report-Only`** — desplazaría el problema a un
  endpoint de informes que este boilerplate no tiene, y dejaría el navegador sin
  política real.

## Consecuencias

- La UI de componentes funciona en la build, que es donde se despliega.
- **El coste aceptado:** una respuesta del agente inyectable en el DOM podría
  escribir CSS. Feo, y como mucho exfiltración por geometría; no ejecución. Para
  eso están el `v-html` fuera del markdown del agente y el `script-src` con hashes.
- El CSP de producción **no es verificable desde dev**. Quien toque estilos o
  dependencias de UI tiene que correr `npm run verify:electron`, que es lo único
  que arranca el servidor construido con la política puesta.
- Añadir una librería que escriba `<style>` en runtime no vuelve a romper nada;
  el margen ya está abierto. El que sí rompe es uno que escriba `<script>`.

## Verificación

`npm run verify:electron`, tres capas, cada una con su fallo propio:

1. **La cabecera servida**: `script-src` con hashes y sin `unsafe-inline`;
   `style-src` exactamente `'self' 'unsafe-inline'`.
2. **El comportamiento**: `/settings` abre un `Select`, exige que su popper quede
   posicionado, elige una opción y comprueba que el valor aparece en el trigger.
   Una política que rompa la UI se ve aquí aunque nadie lea la consola.
3. **Cero avisos de CSP** capturados por CDP (`Log.entryAdded`) en todo el
   recorrido, con el guardián afirmando antes que él mismo está escuchando, para
   que un CDP no disponible no se lea como «todo limpio».

Quitar `'unsafe-inline'` de `style-src` pone roja la 1 y la 3; una política que
además bloquee el posicionamiento pondría roja la 2.
