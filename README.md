# astro-agent-consumer-base

**A production-shaped starting point for frontends that consume AI agents.**
Astro 7 as the app shell *and* the backend-for-frontend, Vue 3.5 as the interactive layer,
streaming that stays smooth under 120 tokens/second, and an Electron shell that packages the
exact same build for Windows, Linux and macOS.

Clone it, rename it, delete the example slice, and you have the architecture — not a demo that
falls apart the first time a real feature lands.

---

## The problem this solves

Every team that builds an agent UI eventually hits the same four walls:

| Wall | How this base handles it |
|---|---|
| **The API key ends up in the browser.** | Astro's server is the BFF. The browser only ever talks to `/api/agent-chat`; the upstream URL and credential never leave the Node process. |
| **The chat stutters.** | The in-flight text isn't a message until it closes, so closed bubbles stay memoized and a stream only re-renders its own bubble. |
| **Feature folders rot into `utils/`.** | Vertical slices with import boundaries enforced by a test, not by a slide in a review deck. |
| **"It works in dev" isn't verification.** | Four gate commands, including one that drives a real Chromium window, types a prompt and waits for the answer to appear. |

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:4321`. **No backend required** — the default transport is `mock`, which
streams simulated tokens so the whole chat, cancellation and error surface is developable
offline. Type `/error` or `/slow` in the composer to trigger the two failure states on demand.

To point at a real agent backend:

```bash
npm run transport:mastra
MASTRA_URL=http://localhost:4111 npm run dev
```

## What's inside

```
src/
├── domains/                 four bounded contexts
│   ├── agent-chat/          the engine: transport, composables, types and the BFF
│   ├── chat-studio/         the screen: one island with the rail, thread and panels
│   ├── connectors/          external sources, knowledge bases and templates
│   └── app-shell/           global chrome state + the navigation progress bar
├── shared/                  kernel with zero domain dependencies
├── components/              app-wide `.astro` primitives (today: `IslandFallback`)
├── layouts/                 Root / App / Bare
├── pages/                   routes + `api/` (the BFF)
└── stores/                  one global Pinia store, and why it's only one
electron/                    desktop shell: main, preload, lib/
tests/                       unit · contracts · BFF · DOM · architecture boundaries
docs/adr/                    eight decisions, each with the cost it accepted
```

### Architecture, in the ADRs

- **[ADR-001](./docs/adr/001-relay-sse-verbatim.md) — the relay copies bytes.** The BFF rewrites
  the path, injects the credential, forces the right cache headers and propagates cancellation,
  but never parses the stream. Re-encoding would mean reimplementing someone else's wire format
  and `JSON.parse`-ing every token in the process that serves your UI. JSON endpoints, in
  contrast, are always normalised and trimmed server-side: system instructions, costs and
  internal ids don't travel to the browser.
- **[ADR-002](./docs/adr/002-composable-first.md) — composable first.** Every Astro island is
  its own `createApp()`, so global state is a design decision, not a default. Pinia and colada
  are installed once, through `@astrojs/vue`'s `appEntrypoint`, and a new store needs to pass a
  written trigger to get added.
- **[ADR-003](./docs/adr/003-mock-first.md) — mock first.** The transport is an interface. The
  mock and the real client are exact substitutes, which is what makes the boilerplate testable
  offline and the provider replaceable in one file.
- **[ADR-004](./docs/adr/004-csp-estilos-en-runtime.md) — CSP strict about scripts, honest about
  styles.** `script-src` keeps Astro's per-chunk SHA-256 hashes with no inline exception, which is
  the directive that stops an agent's answer from running code. `style-src` allows inline styles,
  because component libraries compute CSS *after* the build and no build-time hash can cover a
  value the browser invents.
- **[ADR-005](./docs/adr/005-tokens-centralizados-y-escala-fluida.md) — one theme file, fluid
  scale.** `src/styles/theme.css` owns colour, radii, shadows, the type scale, the rhythm and
  the default styling of `h1`…`h6`/`p`/`code`. One token carries its own line-height, weight and
  tracking, so a heading is `text-title` instead of four utilities repeated in thirty call
  sites. Sizes and spacing breathe with `clamp()` instead of per-breakpoint variants, and a test
  fails on any `text-[13px]`, literal `text-white` or hardcoded colour.
- **[ADR-006](./docs/adr/006-identidad-de-memoria-en-el-bff.md) — the BFF owns memory identity.**
  The browser sends the thread, never the `resource` (which is what the provider keys history
  by). The relay opens the request body in exactly one place to bound its size and inject the
  server-decided identity, while the *response* keeps streaming byte for byte.

- **[ADR-008](./docs/adr/008-el-estudio-es-una-isla.md) — the chat studio is one island.** The
  screen shares state across rail, header, thread and panels, and the chat engine only exists in
  the browser, so the island owns its whole chrome: `client:only` + `transition:persist`, with a
  skeleton fallback. It is a declared exception to the "zero-JS chrome" rule, and the ADR writes
  down what it costs.

### Also, because these bite later

- **Vertical slicing with teeth.** `src/domains/x` is only importable through its `index.ts`
  (and a separate `server/index.ts`), so server code can't leak into the browser bundle.
  `tests/architecture/boundaries.spec.ts` fails the build otherwise.
- **Hydration policy per surface** — `client:only` + `transition:persist` for the studio, so a
  stream survives navigation and the state its chrome shares stays honest; `client:media` for
  mobile-only controls, and plain `.astro` for everything that needs no JS. The studio is the one
  island that carries its own chrome (ADR-008).
- **One source of visual truth.** Tailwind v4 `@theme` tokens in a single CSS file
  (`src/styles/theme.css`), including a fluid type scale and the base typography of the document;
  the same `variants()` helper is callable from `.astro` frontmatter and from `<script setup>`,
  and the shadcn-vue primitives read the same palette through semantic aliases.
- **Spanish UI and error catalogues** — no error reaches the screen without a written message.

## Verification

This is the part most templates skip.

| Command | What it proves |
|---|---|
| `npm run all` | ESLint, `astro check`, the Vitest suite, production build. |
| `npm run verify:bundle` | The island's static import graph carries no server code and no secrets, and reports how big it is. |
| `npm run verify:relay` | Against a fake agent backend: the relay forwards the SSE stream **byte for byte**, forces `no-transform`, leaks no cookies, and `checkOrigin` still blocks cross-site POSTs. |
| `npm run verify:electron` | Boots the built server inside Electron, opens a real Chromium window, verifies the `contextBridge` preload, **types a prompt and waits until the streamed answer settles on screen**, opens the context panel and a reka-ui dropdown against the production CSP and fails on any policy violation, then writes `smoke/electron-chat.png`. |

The last one is the only check that sees what the user sees — and the only one that runs the
build with CSP enabled, since dev switches it off for HMR. It found five bugs that every unit
test passed: a missing `duplex: 'half'` that made all real streams 502, response headers being
overwritten by the upstream's, a sandboxed preload that silently never exposed its bridge,
nested refs rendering as `[object Object]`, and a policy whose hashes never covered the
`style=""` attributes the component library ships from the server.

## Desktop

```bash
npm run electron:dev          # astro dev + window, HMR intact
npm run electron:build:linux  # AppImage (x64 + arm64) and .deb into release/
```

The packaged app runs the same `dist/server/entry.mjs` as the web deploy — verified booting with
no `node_modules` alongside it. `dist/` ships **outside** `app.asar` on purpose, because the
server runs as an `ELECTRON_RUN_AS_NODE` child that has no asar filesystem patch. It always
loads `http://127.0.0.1:<dynamic-port>`, never `file://`.

On Linux, Chromium needs a root-owned SUID `chrome-sandbox` to isolate renderers. Most clones
don't have one — `npm install` loses the bit — so the Electron launchers detect that and drop
the renderer sandbox with a printed warning, rather than letting Electron abort with SIGTRAP
before the first check. Packaging is unaffected.

## Starting a product from this base

1. Rename in `package.json` and `electron-builder.yml` (`appId`, `productName`); replace the
   placeholder `author` / `homepage` (the `deb` target requires them).
2. Delete what you won't use. The base already ships lean — three slices, two routes and one
   island per screen — so the usual candidate is the example copy and seed data in
   `chat-studio/data/studio.seed.ts`.
3. Point `env.schema` at your real backend and set timeouts your model actually respects.
4. Let the boundary test tell you what you broke.

## Stack

| | |
|---|---|
| Framework | Astro 7.3 · `output: 'server'` · `@astrojs/node` standalone |
| UI | Vue 3.5 · Pinia 4 · `@pinia/colada` · VueUse |
| Styling | Tailwind CSS v4 (CSS-first `@theme` in `src/styles/theme.css`, no config file) · typography plugin · shadcn-vue (reka-ui) in `src/components/ui/**` |
| Agents | Vercel AI SDK (`ai@7` + `@ai-sdk/vue`) as the chat engine, behind Astro's BFF (ADR-007) |
| Desktop | Electron 44 · electron-builder 26 (NSIS, AppImage/deb, DMG) |
| Quality | TypeScript 5.9 `strictest` · ESLint 10 flat · Vitest 5 · `astro check` |

## Known constraints

- `ai` and `@ai-sdk/vue` are pinned to exact versions: the Vue package depends on the
  same `ai` version exactly, so the two move together or not at all.
- `eslint-plugin-jsx-a11y` isn't installed: its peer range stops at ESLint 9.
- Production CSP allows `'unsafe-inline'` for `style-src` only (ADR-004). The accepted cost is
  that an injectable agent answer could write CSS; it still cannot write script.
- Repo docs (`AGENTS.md`, ADRs) are written in Spanish; the UI and its error catalogues too.
- Playwright-style e2e is intentionally out of scope — `verify:electron` covers the browser path
  without adding a second browser stack.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — cross-cutting rules: boundaries, hydration policy, streaming
  performance, env gotchas, Astro 7 breaking changes, dependency state, Definition of Done.
- Per-directory `AGENTS.md` files, the [ADR index](./docs/adr/README.md), plus
  [`electron/AGENTS.md`](./electron/AGENTS.md) and
  [`docs/lenguaje-visual.md`](./docs/lenguaje-visual.md).
- [Astro docs](https://docs.astro.build/en/install-and-setup/) — every config decision here was
  checked against them, not from memory.

## License

Internal use.
