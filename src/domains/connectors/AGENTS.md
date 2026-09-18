# AGENTS.md — `src/domains/connectors`

El espacio de las fuentes externas: dónde se conectan, qué conjuntos de
conocimiento salen de ellas y qué flujos se guardan. Es lo que abre "Conecta tus
fuentes externas para consultarlas desde el chat" y las dos secciones del rail que
antes avisaban de que no existían.

Es presentación pura: **no tiene `server/`** y no habla con ningún backend. Todo lo
que se ve sale de su semilla, y ese es el único archivo que cambia cuando existan
servicios reales.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/connectors` | `ConnectorsDrawer` (el panel) y el tipo `ConnectorTab` |

El vocabulario de la sección lo consume además el estudio **como tipo**, porque su
shell recuerda en qué sección está el panel: renombrar un valor de `ConnectorTab`
es cambiar el tipo, la semilla y `useStudioShell` a la vez.

## Mapa del directorio

```
index.ts                    barrel: ConnectorsDrawer + tipo
types/connector.types.ts    contrato estable + guarda de sección
data/connectors.seed.ts     semilla, plantillas de alta y copy, en un solo módulo
composables/
  useConnectors.ts          estado del panel (sección, filtros, detalle, borradores)
views/
  ConnectorsDrawer.vue      raíz: la columna del estudio y sus tres secciones
  sources/                  fuentes externas (el grueso del slice)
    SourcesView.vue         catálogo o detalle, nunca los dos
    SourceCard.vue          una fuente en la lista
    SourceStatus.vue        la píldora de estado
    SourceDetail.vue        el detalle, en lectura
    ScopeList.vue           permisos, en lectura o editables
  knowledge/                base de conocimiento
  templates/                plantillas
components/
  ConnectorsHeader.vue      cabecera compacta: sección activa y acciones
  ConnectorSteps.vue        riel de pasos (y su relevo en pantallas estrechas)
  ConnectorFields.vue       formulario de campos (asistente y configuración)
  ConnectorConfigDialog.vue configurar: conexión › permisos › resumen
  ConnectorAddDialog.vue    añadir: familia › conexión › permisos
```

## Reglas del slice

1. **Es una columna del estudio, no otra pantalla.** `ConnectorsDrawer` se monta en
   la fila de `ChatStudio`, hermana del panel de contexto. No navega, no cambia la
   URL y no bloquea nada —sin overlay ni foco atrapado—, así que el composer sigue
   escribible mientras está abierto. Quien lo abre es el estudio, con
   `useStudioShell`; el panel recibe `open` y `tab` y emite `close` y `update:tab`,
   por lo que este slice **no importa nada de `chat-studio`** y no hay ciclo.

2. **Dos paneles a la derecha, como mucho.** El estado del panel de conectores es
   independiente del de contexto: son cosas distintas (uno es de la conversación,
   el otro un espacio de trabajo) y cerrar uno no cierra el otro. La fila los
   coloca —contexto pegado al chat, conectores en el borde exterior— y el CSS
   decide hasta cuándo el segundo empuja en vez de superponerse:

   | Ventana | Panel de conectores |
   |---|---|
   | ≥ 1200 px (`drawer:`) | columna de 21.25rem; los dos conviven |
   | 1100–1200 px | capa fija por la derecha, encima del panel de contexto |
   | < 1100 px | además a ancho completo (allí el de contexto ya es cajón) |

   El cierre va con `transform` y margen negativo —sin reflow, como el rail— y
   lleva `inert` cuando está cerrado: fuera de pantalla no debe poder recorrerse
   con el teclado. **Ojo con `inert`**: `:inert="false"` pinta `inert="false"`, y el
   atributo es booleano por presencia, así que el panel *abierto* quedaría inerte.
   Se pasa `undefined` para quitarlo.

3. **El estado va por `provide`/`inject`, no por Pinia.** El panel entero es una
   isla, así que no hay nada que compartir por módulo. Es el mismo trato que el
   estudio con `useStudioShell`. La raíz **no inyecta lo que provee**: trabaja con
   el objeto que le devuelve `provideConnectors`.

4. **Editar no es guardar.** `openConfig` clona la fuente en un borrador y solo
   `saveConfig` lo devuelve al catálogo; cerrar con la cruz, con `Escape` o con
   "Cancelar" descarta. Lo mismo con el alta (`openAdd` + `saveAdd`). El detalle se
   guarda **por id**, no por objeto, para que después de guardar siga enseñando la
   fuente actualizada y no una copia huérfana.

5. **Guardar no cambia el estado de la fuente.** Rellenar una credencial no
   demuestra que la conexión funcione, y este esqueleto no puede comprobarlo: una
   fuente con error sigue con error hasta que exista una sincronización de verdad.
   Lo que sí estrena el asistente es `pending`, que es el estado honesto de un alta
   sin autorizar.

6. **Una sección, un asunto.** Cambiar de sección cierra el detalle abierto (volver
   a "Conectores" no debe reabrir una ficha que ya no se estaba mirando) y el alta
   salta a "Conectores" al terminar: crear algo que no aparece donde estás mirando
   se lee como que no se creó.

7. **Los modales por pasos son para lo que tiene pasos.** Los dos modales del panel
   lo son —configurar (conexión › permisos › resumen) y añadir (familia › conexión ›
   permisos)— porque en una sola columna la segunda mitad del formulario no se ve.
   El `Stepper` del registry es `linear`: no se salta hacia adelante, y en el alta la
   familia se elige antes de escribir campos, así que cambiar de familia no borra
   trabajo hecho. Tres detalles que cuestan un rato si no se saben:

   - Los separadores van **dentro** de su `StepperItem`: fuera, la inyección del
     contexto de item no existe y el árbol entra en bucle de renders.
   - Los pasos son **1-based**, no índices de array.
   - Los obligatorios vacíos bloquean el "Siguiente" del paso donde están, que es
     donde se puede decir qué falta; dejarlo para el final obligaría a volver atrás
     sin señalar el paso. Es lo que hace que la credencial caducada de la semilla se
     lea como lo que es.

   El resumen del paso 3 da **cifras**, no una copia del formulario: repetir los
   campos sería un segundo sitio donde mirar lo mismo.

8. **Los estados que no se ven, en la semilla.** Tres fuentes, una por estado
   (conectada, con error, sin conectar), que son exactamente los tres filtros: así
   ninguno sale vacío por construcción. Sin un caso malo en la semilla, el aviso de
   atención y los filtros serían un adorno que siempre sale en verde. Los tres
   estados de la vista se pueden provocar: "Actualizar" levanta la carga, y
   combinar filtro y búsqueda lleva al vacío.

9. **Una sola columna, sin breakpoints de ventana.** El contenido vive en 340 px, así
   que las variantes `nav:`/`context:` —que miden la **ventana**, no el contenedor—
   mentirían: a 1400 px de ventana el panel sigue teniendo 340. Lo que se apila lo
   decide el flujo (`flex-wrap`, `flex-col`), no el ancho de la pantalla.

10. **Compacto, y el aire de la `Card` no es del panel.** El panel se declara
    `data-density="compact"` (ver `AGENTS.md` raíz) y las tarjetas usan `Card` con
    `gap-0 py-0` más un bloque interior `p-3`: con la geometría del registry cada
    tarjeta medía ~230 px de alto, la mitad aire, y tres llenaban la columna. Se
    ajusta geometría, nunca color ni radio. Los controles bajan un escalón
    (`size="xs"`, búsqueda `h-8`), las descripciones van a `text-caption` y se
    recortan a dos líneas para que todas las tarjetas midan lo mismo, y la nota de
    estado solo se pinta cuando el estado **no** es "conectada": en una fuente sana
    repetiría lo que ya dicen la píldora y la fecha.

11. **Nada de marcas ni de colores en los datos.** El tono de un estado lo elige el
    componente que lo pinta (`SourceStatus` usa la variante de la `Badge`) y el
    catálogo es genérico por familia, como el resto del boilerplate.

## Cómo se prueba

```bash
npm run test          # tests/dom/connectors-panel.spec.ts: panel, secciones, filtros,
                      #   detalle, alta y los pasos de la configuración
npm run test          # tests/dom/studio-connectors-doors.spec.ts: las puertas desde el estudio
```

Dos detalles del arnés que cuestan un rato si no se saben:

- El `Dialog` del registry se teletransporta a `document.body` y en jsdom **no
  ejecuta su animación de salida**, así que el de un caso anterior puede seguir
  montado: se busca el diálogo por su contenido, no "un" diálogo.
- El `Tabs` del registry activa en **`mousedown`**, no en `click` (así se puede
  arrastrar sobre las pestañas sin activarlas). En un navegador el clic real lo
  dispara igual; en el test hay que emitir el evento que el componente escucha.
