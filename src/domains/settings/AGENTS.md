# AGENTS.md — `src/domains/settings`

Preferencia de interfaz del producto: el tema y las preferencias de chat. Es el
espacio de configuración del panel lateral del estudio —el que abre el pie del
rail—, no una pantalla con ruta.

No tiene `server/`: no hay nada que guardar en un backend ni preferencia por
cuenta. El día que las haya, su contrato entra por `types/` y su lectura por
`server/`, como en cualquier slice.

## Superficie pública

| Importar | Qué da |
|---|---|
| `@domains/settings` | `SettingsPanel` (el contenido del panel) y `THEME_OPTIONS` |

`THEME_OPTIONS` se exporta **a propósito**: los tres estados del tema los pintan dos
sitios —este panel y el menú de la tarjeta de usuario del rail—, así que la lista es
una sola o son dos listas que se desincronizan al primer tema nuevo. Es la excepción
que confirma la regla de "lo que no está en el barrel no es público".

## Mapa del directorio

```
index.ts                    barrel: SettingsPanel + THEME_OPTIONS
types/settings.types.ts     SettingOption, ThemeOption, ChatPreferences
data/settings.seed.ts       opciones, valores de partida y copy, en un solo módulo
composables/useSettings.ts  estado del panel (tema real, preferencias de ejemplo)
views/SettingsPanel.vue     raíz: el espacio de configuración (contenido, sin cajón)
```

## Reglas del slice

1. **Es contenido, no cajón.** Igual que el espacio de conectores: el ancho, el
   cierre con margen negativo, la densidad compacta y el `inert` los pone
   `StudioSidePanel` (slice del estudio). Un tercer espacio no tendría que tocar
   nada de eso.

2. **Lo real y lo simulado se distinguen en la primera línea, no en un comentario.**
   El tema escribe en el store global y se ve al instante; el agente, el modelo y el
   envío con Enter son de ejemplo y no llegan a la conversación. El panel lo dice
   arriba del todo: un control que parece guardar algo y no hace nada es peor que no
   tenerlo, y decirlo es más barato que fingirlo.

3. **El tema se lee del store, no se copia.** `useAppShellStore` es el dueño —lo
   comparten el rail, los atajos y el chrome—, así que el panel devuelve una
   referencia a su valor y escribe con su `setTheme`. Duplicarlo aquí daría dos
   verdades y el conmutador del rail se desincronizaría.

4. **Los valores de partida tienen que ser los reales.** El agente sale de
   `DEFAULT_AGENT_ID` y Enter envía porque es lo que hace el composer hoy: si el
   panel arrancara mintiendo sobre el estado actual, la configuración entera
   perdería el sentido.

5. **Sin `provide`/`inject`, y es una decisión.** El panel es un solo componente y no
   tiene descendientes que necesiten su estado; montar el canal para un consumidor
   sería ceremonia sin lector. El día que las secciones se partan en componentes, se
   añade —como en conectores—.

6. **Los ajustes van en filas** —etiqueta a la izquierda, control a la derecha— y el
   tema segmentado, porque son tres opciones cortas y excluyentes. En 340 px una
   columna de campos con la etiqueta encima ocupa el doble y se lee peor.

7. **Sin breakpoints de ventana.** El contenido vive en una columna de 21.25rem, así
   que `nav:`/`context:` mentirían —miden la ventana, no el contenedor—. Es la misma
   regla que en conectores.

8. **Los catálogos copiados son deuda declarada.** Las cuentas de agente y los
   modelos están aquí copiados del backend y del estudio. Cuando la preferencia sea
   real, esto tiene que **leer el catálogo de su dueño** en vez de copiarlo, o
   tendremos dos listas que se desincronizan.

## Cómo se prueba

```bash
npm run test          # tests/dom/settings-panel.spec.ts: el tema de verdad y las
                      #   preferencias de ejemplo
npm run test          # tests/dom/studio-side-panel.spec.ts: que ocupe el mismo cajón
```

Los dos selectores de agente y modelo **no** se accionan en jsdom: son de reka-ui y
no responden a eventos sintéticos, el mismo trato que el resto de sus capas. Su
cableado se comprueba por el composable, que es donde vive el estado.
