# AGENTS.md — `src/domains/connectors`

El espacio de las fuentes externas: dónde se conectan, qué conjuntos de
conocimiento salen de ellas y qué flujos se guardan. Es la pantalla que abre
"Conecta tus fuentes externas para consultarlas desde el chat" y las secciones del
rail que antes avisaban de que no existían.

Presentación pura: **no tiene `server/`** y no habla con ningún backend. Todo lo
que se ve sale de su semilla, y ese es el único archivo que cambia cuando existan
servicios reales.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/connectors` | `ConnectorsView` (isla de la vista), `isConnectorTab` y el tipo `ConnectorTab` |

Páginas y layouts importan solo por el barrel. El vocabulario de la pestaña lo
consume además el estudio **como tipo** (`useStudioConnectors`), así que renombrar
un valor de `ConnectorTab` es cambiar el tipo, la semilla y `routes.connectors` a
la vez.

## Mapa del directorio

```
index.ts                  barrel: ConnectorsView + tipos
types/connector.types.ts  contrato estable + guarda del ?pestana=
data/connectors.seed.ts   semilla y copy, en un solo módulo
composables/
  useConnectors.ts        estado de la vista (pestaña, filtros, detalle, borrador)
views/
  ConnectorsView.vue      raíz: la capa a pantalla completa con las tres pestañas
  sources/                fuentes externas (el grueso del slice)
    SourcesView.vue       catálogo o detalle, nunca los dos
    SourceCard.vue        una fuente en la rejilla
    SourceStatus.vue      la píldora de estado
    SourceDetail.vue      el detalle, en lectura
    ScopeList.vue         permisos, en lectura o editables
  knowledge/              base de conocimiento
  templates/              plantillas
components/
  ConnectorsHeader.vue    barra superior: volver, título y acciones
  ConnectorConfigDialog.vue  el modal de configuración, sobre un borrador
```

## Reglas del slice

1. **La vista es una capa, no una pantalla.** Se monta en el slot `layer` de
   `AppLayout`, después de `ChatStudio`, para que el estudio siga vivo debajo: el
   rail está siempre a la vista, así que esta capa se abre también a mitad de
   conversación. Lo que hace posible que no se corte es que la URL cargue `hilo` y
   `agente` (los mismos que recibe la isla persistida) y `volver` (la ruta exacta
   de salida). Quien la abre es `useStudioConnectors`, en el slice del estudio.

2. **La pestaña es la URL.** Se lee de `?pestana=` en el servidor y se reescribe
   con `history.replaceState` al cambiarla: el enlace se comparte y se recarga
   igual, sin volver a pedir la página ni remontar la isla. Por eso "volver" sí es
   una navegación y el botón atrás del navegador funciona solo.

3. **El estado va por `provide`/`inject`, no por Pinia.** La vista entera es una
   isla, así que no hay nada que compartir por módulo. Es el mismo trato que el
   estudio con `useStudioShell`. La raíz **no inyecta lo que provee**: trabaja con
   el objeto que le devuelve `provideConnectors`.

4. **Editar no es guardar.** `openConfig` clona el conector en un borrador y solo
   `saveConfig` lo devuelve al catálogo; cerrar con la cruz, con `Escape` o con
   "Cancelar" descarta. El detalle se guarda **por id**, no por objeto, para que
   después de guardar siga enseñando el conector actualizado y no una copia
   huérfana.

5. **El detalle es un panel; el modal es para configurar.** Ver y editar no se
   mezclan: quien abre el detalle suele estar comprobando qué se va a leer. Los
   secretos no se pintan ni en el detalle —un valor en pantalla deja de ser
   secreto—.

6. **Un secreto no sale del dato.** En el detalle se dice "Definido" o "Sin
   definir"; el valor solo existe dentro del borrador que edita el modal.

7. **Los estados que no se ven, en la semilla.** Los cuatro —conectado,
   pendiente, con error, sin conectar— están representados a propósito: sin un caso
   malo, los filtros y el aviso de atención serían un adorno que siempre sale en
   verde. Los tres estados de la vista (carga, vacío y aviso) se pueden provocar:
   "Actualizar" levanta la carga, y combinar filtro y búsqueda lleva al vacío.

8. **Nada de marcas ni de colores en los datos.** El tono de un estado lo elige el
   componente que lo pinta (`SourceStatus` usa la variante de la `Badge`), y el
   catálogo es genérico por familia, como el resto del boilerplate.

## Cómo se prueba

```bash
npm run test          # tests/dom/connectors-view.spec.ts: vista, filtros, detalle y borrador
npm run test          # tests/dom/studio-connectors-doors.spec.ts: las puertas desde el estudio
npm run test          # tests/config/routes.spec.ts: la forma de la URL
```

Lo que **no** se prueba en jsdom: el ciclo abrir → cerrar del `Dialog` del
registry, porque su botón de la `X` es de reka-ui, sus eventos sintéticos no lo
disparan y el contenido espera una animación de salida que jsdom no ejecuta. Es el
mismo trato que el modal del estudio; lo que sí se cubre es nuestro cableado (que
el modal aparezca con el conector pulsado) y el estado (que cancelar no escriba).
