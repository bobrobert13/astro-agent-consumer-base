# AGENTS.md — `electron/`

Shell de escritorio. **No hay lógica de producto aquí**: levanta el servidor Astro
construido, abre una ventana sobre `http://127.0.0.1:<puerto>` y expone un puente
mínimo. Todo lo que se ve en pantalla es la misma app web, servida por el mismo
`dist/server/entry.mjs` que en el navegador.

## Mapa

```
main.mjs                 proceso principal: ventana, menú, ciclo de vida
preload.cjs              contextBridge (CJS, sin requires propios)
lib/astro-server.mjs     spawn del servidor + puerto + readiness + limpieza
lib/paths.mjs            dev vs paquete: dónde está dist/
lib/register-ipc.mjs     handlers del main (compartidos con el smoke)
lib/ipc.mjs              nombres de canal y allowlist de URLs externas
lib/free-port.mjs        puerto dinámico en loopback
lib/single-instance.mjs  una ventana = un servidor
lib/logger.mjs           log en app.getPath('logs')
```

## Las cinco reglas que sostienen el diseño

1. **Nunca `file://` ni `loadFile()`.** Rompe los módulos ESM por CORS, rompe
   `fetch` same-origin y el `Origin: null` de los POST choca contra
   `security.checkOrigin` de Astro (403 en toda la app). Se siempre
   `loadURL('http://127.0.0.1:<puerto>')`.
2. **`dist/` viaja fuera de `app.asar`** (`extraResources` en
   `electron-builder.yml`). El servidor Astro se ejecuta como proceso hijo con
   `ELECTRON_RUN_AS_NODE=1`, y ese proceso **no** lleva el parche de `fs` que pone
   asar en las rutas; además `send` hace `fs.stat` sobre `dist/client`.
   `asarUnpack: ['dist/**']` no sirve: deja rutas `<asar>.unpacked` que el hijo no
   reconstruye.
3. **Un solo dueño del puerto.** Puerto dinámico + `requestSingleInstanceLock()`:
   dos instancias significarían dos servidores y dos vistas de la misma memoria.
4. **El preload es la frontera de seguridad.** `sandbox: true`,
   `contextIsolation: true`, `nodeIntegration: false`. Se exponen valores planos y
   dos acciones; nada de `ipcRenderer` crudo ni `invoke` genérico, porque un XSS de
   una isla se convertiría en IPC arbitrario.
5. **Validar en el main, no en el renderer.** `isSafeExternalUrl` rechaza
   cualquier cosa que no sea `http`/`https` antes de `shell.openExternal`.

## Trampas verificadas en esta máquina

- **`await app.whenReady()` en el nivel superior de un main ESM nunca reanuda.** El
  cuerpo va dentro de una función invocada síncronamente durante la evaluación del
  módulo (`void bootstrap()` en `main.mjs`, `run()` en el smoke).
- **Un preload sandboxeado no puede `require` archivos propios** (solo un
  subconjunto de Electron/Node). Los canales están escritos literales en
  `preload.cjs`; `tests/architecture/ipc-channels.spec.ts` corta la deriva contra
  `lib/ipc.mjs`.
- **`contextBridge` no soporta getters** ni descriptores: con ellos el
  `exposeInMainWorld` completo falla y `window.desktop` queda `undefined` sin
  mensaje claro.
- **`--no-sandbox` va antes de la ruta del script** al lanzar Electron a mano;
  después, se pasa como argv de la app y el sandbox sigue activo.
- **Windows**: `windowsHide: true` (consola negra) y `app.setAppUserModelId()`
  (si no, las notificaciones no las toma la app).
- **Linux**: el AppImage necesita FUSE; sin él,
  `--appimage-extract-and-run`.
- **macOS**: `hardenedRuntime` + notarización, y `close ≠ quit` (bandera
  `isQuitting`) para que `activate` revive la ventana.

## Comandos

```bash
npm run electron:dev        # astro dev + ventana, con HMR
npm run verify:electron     # smoke real: servidor, isla, stream, captura
npm run electron:build:linux
```

El smoke deja `smoke/electron-chat.png` (fuera de git). Si falla, mirar ahí antes
de tocar código: es la única prueba de lo que el usuario ve.

## Al empaquetar

`electron:build:*` ejecuta `npm run build` antes. Si se cambia `astro.config.mjs`
o cualquier variable `access: 'secret'`, **no hace falta recompilar el paquete**:
el servidor las lee al arrancar. Lo que sí va hornado en el bundle es
`PUBLIC_AGENT_TRANSPORT` y `PUBLIC_APP_NAME`.
