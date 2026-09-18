# AGENTS.md — `src/domains/chat-studio`

La pantalla: el rail, el panel central con su estado vacío y su hilo, el panel de
contexto y sus capas. Es **presentación**, no motor: hablar con el agente es de
`agent-chat`, y este slice lo consume por su barrel.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/chat-studio` | `ChatStudio` (isla raíz) y los tipos de sus datos |

No tiene `server/`: no habla con el backend, solo con el motor de chat.

## Por qué el estudio entero es una isla

`ChatStudio` se monta con `client:only="vue"` + `transition:persist` desde
`src/layouts/AppLayout.astro`, y dentro vive **todo** lo interactivo.

La alternativa —chrome `.astro` sin hidratar más islas pequeñas— no es viable aquí,
y conviene tenerlo escrito porque va contra la política general del repositorio:

1. El hilo tiene que sobrevivir a la navegación entre `/` y `/chat/<hilo>`, y quien
   lo posee es el motor del chat, cuyo núcleo (el AI SDK) **solo existe en el
   navegador**. Una isla que contenga el hilo no puede renderizarse en servidor.
2. El chrome es interactivo de verdad: rail, cajón, menús, pestañas, modal, toasts.
   Repartirlo en islas hermanas obligaría a manipular desde fuera un DOM ajeno.

El hueco previo a la hidratación lo cubre el `slot="fallback"` del layout
(`IslandFallback`), y las consecuencias están asumidas y verificadas: el smoke de
Electron comprueba que la isla hidrata en Chromium y que el CSP no se rompe.

## Mapa del directorio

```
index.ts            barrel: ChatStudio
types/              vocabulario del slice (NavItem, ResourceRow, PanelTab…)
data/studio.seed.ts datos semilla y copy, en un solo módulo
composables/
  useStudioShell.ts     estado del chrome (rail, cajón, panel, modelo) + provide
  useStudioShortcuts.ts atajos del estudio
components/             .vue del slice
  ChatStudio.vue        raíz: composición, provide y atadura de la URL al chat
  StudioSidebar/Nav/History/UserCard      el rail
  StudioPanel/PanelHeader/ModelMenu/Hero  el panel y su cabecera
  StudioComposer/ComposerTools/ConnectBar/Suggestions   la caja de escritura
  StudioThread/Message/Markdown/ToolCall/Notice/MemoryNotice/StatusBar  el hilo
  StudioContextPanel/ResourceRow/SourceRow/PreviewDialog  el panel derecho
  StudioFabs/HelpMenu   las acciones flotantes
  StudioImageSlot       hueco vacío para una imagen
  studio.memo.ts        dependencias de `v-memo` del globo
```

Ningún `.vue` pasa de ~150 líneas. Si uno crece, se extrae subcomponente antes de
seguir: el slice se lee por partes, no por archivos grandes.

## Reglas del slice

1. **El estado del chrome va por `provide`/`inject`, no por Pinia.** El estudio es
   una isla, así que ese estado no cruza ninguna frontera y no hay nada que
   compartir por módulo. Lo que sí es global —el rail y el tema— vive en
   `@stores/app-shell`.
2. **Nadie inyecta lo que él mismo provee.** `inject` resuelve desde el **padre**,
   así que un componente no ve su propio `provide`. `useStudioShortcuts` recibe el
   shell **por parámetro** por esto: llamarlo desde la raíz con `useStudioShell()`
   lanzaba en el `setup` y dejaba la isla **completamente vacía**, sin un solo error
   en consola en producción (el `sink` de `reportError` solo escribe en DEV). Si
   aparece una isla en blanco, mirar aquí primero.
3. **El composer es único aunque tenga dos sitios.** En el estado vacío va dentro
   del hero y con conversación se acopla abajo; son excluyentes, así que nunca hay
   dos campos con el id `aac-composer`. El borrador vive en el composable
   compartido, así que cambiar de sitio no lo pierde.
4. **Las zonas de esqueleto avisan, no callan.** Nav, "más opciones", compartir o
   conectar fuentes emiten un toast con `notYet()`. Un botón mudo se lee como una
   app rota.
5. **Cero imágenes de marca.** Cada imagen es un `StudioImageSlot`, con su nombre en
   `data-image-slot`; para poner la definitiva basta con pasarle `src`.

## Contrato con el gate de verificación

Renombrar cualquiera de estos rompe una comprobación que **no** falla al
compilar. Si se cambian, se actualiza el script en el mismo commit:

| Qué | Dónde | Quién lo usa |
|---|---|---|
| `id="aac-composer"` | `StudioComposer.vue` | `scripts/electron-smoke.mjs` (hidratación y prompt) |
| `article` + `.rounded-bubble` | `StudioMessage.vue` | el smoke mide el texto del transcript |
| `Conversación con el agente` | `aria-label` de `StudioPanel` | `scripts/verify-bundle.mjs` localiza el chunk de la isla |
| `Estado de la ejecución` | `aria-label` de `StudioStatusBar` | los tests distinguen esta franja del aviso de memoria |
| umbral `0.8` + `role="status" aria-live="polite"` | `StudioMemoryNotice.vue` | regresión del aviso de memoria |
| `v-memo` con la longitud del texto | `studio.memo.ts` | sin ella el globo en vuelo se congela |

## Cómo se prueba

```bash
npm run test                      # incluye la isla completa contra el mock
npm run verify:electron           # hidratación, stream en pantalla y CSP
npm run transport:mock && npm run dev
# /error, /slow, /memory y /tripwire provocan los cuatro estados que no se ven solos
```

Lo que **no** se prueba en jsdom, y por qué: reka-ui mantiene el contenido de sus
capas montado hasta que termina su animación de salida, y en jsdom no hay
animaciones; además, sus manejadores no responden a eventos sintéticos. Por eso el
ciclo abrir → cerrar del modal se comprueba **a mano en Chromium** (verificado), y
los tests de DOM se quedan con el contrato propio: el modal sigue al estado del
estudio. Si algún día se quiere automatizar, el sitio es el smoke, no jsdom.
