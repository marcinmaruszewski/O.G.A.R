# O.G.A.R.

**Osobisty Generator Asystencji i Raportów** — a private, local-first Electron
desktop app (Windows) that helps a developer work on Jira tickets with a local
LLM and report work time to Tempo. All state lives in a single embedded SQLite
file that self-creates on first run; nothing leaves your machine.

See the PRD epic `o_g_a_r-lip` in the beads tracker for the full product vision.

## Stack

- **Electron** + **electron-vite** (typed IPC over `contextBridge`/`invoke`)
- **React 18** + **Tailwind CSS** + **shadcn/ui** (renderer)
- **better-sqlite3** (embedded database, migrations keyed on `PRAGMA user_version`)
- **TypeScript**, **Vitest** (test-driven core)

## Prerequisites

- Node.js 22+ (developed on 24)
- A C/C++ toolchain for the `better-sqlite3` native module
  (Windows: "Desktop development with C++" workload; Linux: `build-essential`, `python3`)

## Commands

```bash
npm install          # install dependencies (builds better-sqlite3 for Node)
npm test             # run the Vitest suite
npm run typecheck    # tsc --noEmit across main, preload, renderer
npm run dev          # launch the app in dev (see native-module note below)
npm run build        # bundle main, preload, renderer into ./out
```

## Packaging

```bash
npm run dist:win    # NSIS .exe (Windows only — run on Windows or cross-compile)
npm run dist:linux  # AppImage (Linux/WSL)
npm run dist        # default target for current OS
```

The Electron version is pinned at `33.4.11`. `electron-builder` rebuilds
`better-sqlite3` against the pinned Electron ABI automatically during packaging,
so you do **not** need to run `rebuild:electron` manually before `dist`.

**Windows verification (HITL):** After `npm run dist:win`, install the produced
`.exe` on a Windows machine, launch the app, and confirm it opens and reads from
SQLite (the window should show "O.G.A.R." and "schema version 1").

## Native module: better-sqlite3 ABI

`better-sqlite3` is a V8-ABI native module, so its compiled binary must match the
runtime that loads it. The Node ABI (used by `npm test`) and the Electron ABI
(used by the app) differ, and only one binary can be installed at a time:

| You want to…            | Run first                  | Why                                  |
| ----------------------- | -------------------------- | ------------------------------------ |
| Run the app (`npm run dev` / `preview`) | `npm run rebuild:electron` | rebuilds the binary for Electron's ABI |
| Run tests (`npm test`)  | `npm run rebuild:node`     | restores the binary for Node's ABI   |

After a fresh `npm install` the binary is built for **Node**, so tests work
immediately. Switch ABIs only when moving between testing and running the app.
(Packaging will rebuild against the pinned Electron version automatically — see
issue `o_g_a_r-uvy`.)

## Security model

The renderer runs with `contextIsolation: true` and `nodeIntegration: false`, so
it has **no direct Node access**. The preload script is the only bridge, exposing
a typed, minimal API (`window.ogar`) via `contextBridge`. `sandbox` is disabled
so the preload can use ESM and the app can load only local content (enforced by a
strict Content-Security-Policy in `index.html`).

## Project structure

```
src/
  main/          Electron main process
    db/          migration runner, schema, database open/read (unit-tested)
    ipc.ts       registers the typed IPC handlers
    index.ts     app entry: opens the DB, wires IPC, creates the window
  preload/       contextBridge exposing window.ogar
  renderer/      React + Tailwind + shadcn UI
  shared/        IPC contract shared by all three layers
```
