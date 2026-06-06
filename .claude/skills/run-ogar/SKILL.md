---
name: run-ogar
description: Build, run, and drive the O.G.A.R. Electron desktop app. Use when asked to start the app, take a screenshot, verify a UI change, or interact with the dashboard.
---

O.G.A.R. is an Electron + React app. For agent/headless use, drive it via the Playwright REPL at `.claude/skills/run-ogar/driver.mjs` under xvfb.

All paths relative to repo root.

## Prerequisites

```bash
# Already present in this env; add if missing:
apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 \
  libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2
npm install --save-dev playwright-core
```

## Build

```bash
npm run build
```

## Run (agent path — tmux REPL)

```bash
tmux new-session -d -s ogar -x 200 -y 50
tmux send-keys -t ogar 'cd /home/mmarus03/marcinmaruszewski/o.g.a.r && xvfb-run -a node .claude/skills/run-ogar/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t ogar -p | grep -q "driver>"; do sleep 0.2; done'
tmux send-keys -t ogar 'launch' Enter
timeout 60 bash -c 'until tmux capture-pane -t ogar -p | grep -q "launched"; do sleep 0.2; done'
tmux send-keys -t ogar 'ss landing' Enter
timeout 10 bash -c 'until tmux capture-pane -t ogar -p | grep -q "screenshot:"; do sleep 0.2; done'
tmux capture-pane -t ogar -p
```

Screenshots land in `/tmp/shots/` (override: `SCREENSHOT_DIR`).

## Commands

| command | what it does |
|---|---|
| `launch` | launch the app, wait for renderer window |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `click <css-sel>` | click element via DOM (not coords) |
| `click-text <text>` | click button/link containing text |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for element (10s timeout) |
| `eval <js>` | evaluate JS in the page, print JSON |
| `text [css-sel]` | print innerText of element or body |
| `windows` | list all windows |
| `quit` | close app, exit |

## Gotchas

- **`--no-sandbox` required** — Electron sandbox needs CAP_SYS_ADMIN, not available in WSL2 without extra config.
- **`out/` must exist** — run `npm run build` before launching; the app loads from `out/`, not `src/`.

## Troubleshooting

- **Launch timeout:** `out/main/index.js` missing? → `npm run build` first.
- **"Missing X server":** forgot `xvfb-run -a`. Headless Linux needs it.
- **Stale Xvfb locks:** `rm -f /tmp/.X*-lock; pkill Xvfb`
