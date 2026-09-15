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
| **The API key ends up in the browser.** | Astro's server is the BFF. The browser only ever talks to `/api/agent-rpc/*`; the upstream URL and credential never leave the Node process. |
| **The chat stutters.** | `shallowRef` + a token batcher: 100 deltas become one write per frame. The in-flight text isn't a message until it closes. |
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
├── domains/                 five bounded contexts
│   ├── agent-chat/          ← implemented end to end: this is the pattern to copy
│   ├── agent-registry/      ┐
│   ├── agent-sessions/      │ skeletons: BFF + cached hook + types + AGENTS.md
│   ├── agent-config/        │
│   └── app-shell/           ┘
├── shared/                  kernel with zero domain dependencies
├── components/              app-wide `.astro` primitives, zero JS
├── layouts/                 Root / App / Bare
├── pages/                   routes + `api/` (the BFF)
└── stores/                  one global Pinia store, and why it's only one
electron/                    desktop shell: main, preload, lib/
tests/                       unit · contracts · BFF · DOM · architecture boundaries
docs/adr/                    three decisions, each with the cost it accepted
```

### Architecture, in three decisions

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

### Also, because these bite later

- **Vertical slicing with teeth.** `src/domains/x` is only importable through its `index.ts`
  (and a separate `server/index.ts`), so server code can't leak into the browser bundle.
  `tests/architecture/boundaries.spec.ts` fails the build otherwise.
- **Hydration policy per surface** — `client:only` + `transition:persist` for the chat so a
  stream survives navigation, `client:idle` for the sidebar, `client:media` for mobile-only
  controls, and plain `.astro` for everything that needs no JS.
- **One source of visual truth.** Tailwind v4 `@theme` tokens in a single CSS file; the same
  `variants()` helper is callable from `.astro` frontmatter and from `<script setup>`.
- **Spanish UI and error catalogues** — no error reaches the screen without a written message.

## Verification

This is the part most templates skip.

| Command | What it proves |
|---|---|
| `npm run all` | ESLint, `astro check`, 113 Vitest tests, production build. |
| `npm run verify:bundle` | The agent provider's client lives only in a deferred chunk, outside the island's static import graph. |
| `npm run verify:relay` | Against a fake agent backend: the relay forwards the SSE stream **byte for byte**, forces `no-transform`, leaks no cookies, and `checkOrigin` still blocks cross-site POSTs. |
| `npm run verify:electron` | Boots the built server inside Electron, opens a real Chromium window, verifies the `contextBridge` preload, **types a prompt and waits until the streamed answer settles on screen**, and writes `smoke/electron-chat.png`. |

The last one is the only check that sees what the user sees. It found four bugs that every unit
test passed: a missing `duplex: 'half'` that made all real streams 502, response headers being
overwritten by the upstream's, a sandboxed preload that silently never exposed its bridge, and
nested refs rendering as `[object Object]`.

## Desktop

```bash
npm run electron:dev          # astro dev + window, HMR intact
npm run electron:build:linux  # AppImage (x64 + arm64) and .deb into release/
```

The packaged app runs the same `dist/server/entry.mjs` as the web deploy — verified booting with
no `node_modules` alongside it. `dist/` ships **outside** `app.asar` on purpose, because the
server runs as an `ELECTRON_RUN_AS_NODE` child that has no asar filesystem patch. It always
loads `http://127.0.0.1:<dynamic-port>`, never `file://`.

## Starting a product from this base

1. Rename in `package.json` and `electron-builder.yml` (`appId`, `productName`); replace the
   placeholder `author` / `homepage` (the `deb` target requires them).
2. Delete what you won't use: the `agent-chat` example, `pages/agents`, `pages/history`,
   `pages/settings`, and any skeleton slice that won't exist.
3. Point `env.schema` at your real backend and set timeouts your model actually respects.
4. Let the boundary test tell you what you broke.

## Stack

| | |
|---|---|
| Framework | Astro 7.3 · `output: 'server'` · `@astrojs/node` standalone |
| UI | Vue 3.5 · Pinia 4 · `@pinia/colada` · VueUse |
| Styling | Tailwind CSS v4 (CSS-first `@theme`, no config file) · typography plugin |
| Agents | `@mastra/client-js` behind a provider-agnostic `AgentTransport` |
| Desktop | Electron 44 · electron-builder 26 (NSIS, AppImage/deb, DMG) |
| Quality | TypeScript 5.9 `strictest` · ESLint 10 flat · Vitest 5 · `astro check` |

## Known constraints

- `@mastra/client-js` pulls `@mastra/core` as a dependency and pins a transitive package with an
  open low-severity advisory. It is isolated in one lazily-loaded file, and `readSseLines()` in
  `src/shared/streams/sse.ts` implements the same transport contract without it — that's the
  documented exit.
- `eslint-plugin-jsx-a11y` isn't installed: its peer range stops at ESLint 9.
- Repo docs (`AGENTS.md`, ADRs) are written in Spanish; the UI and its error catalogues too.
- Playwright-style e2e is intentionally out of scope — `verify:electron` covers the browser path
  without adding a second browser stack.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — cross-cutting rules: boundaries, hydration policy, streaming
  performance, env gotchas, Astro 7 breaking changes, dependency state, Definition of Done.
- Per-directory `AGENTS.md` files, plus [`electron/AGENTS.md`](./electron/AGENTS.md) and
  [`docs/lenguaje-visual.md`](./docs/lenguaje-visual.md).
- [Astro docs](https://docs.astro.build/en/install-and-setup/) — every config decision here was
  checked against them, not from memory.

## License

Internal use.
