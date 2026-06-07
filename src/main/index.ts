import { join } from "node:path";
import { BrowserWindow, app, ipcMain, safeStorage } from "electron";
import { openDatabase } from "./db/database.js";
import { registerIpcHandlers } from "./ipc.js";
import type { SafeStorageAdapter } from "./settings/secret-store.js";

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      // electron-vite emits the preload as .mjs (ESM preloads require it).
      preload: join(import.meta.dirname, "../preload/index.mjs"),
      // contextIsolation keeps the renderer in its own world; nodeIntegration off
      // means it has no direct Node access. The preload (sandbox off) is the only
      // bridge, exposing a typed API via contextBridge.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.on("ready-to-show", () => window.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  }
}

// On Linux (including WSL2) safeStorage requires a system keyring that is not
// always present. Switching to the basic password store enables obfuscated
// storage without requiring GNOME Keyring or KWallet.
if (process.platform === "linux") {
  app.commandLine.appendSwitch("password-store", "basic");
}

app.whenReady().then(() => {
  const db = openDatabase(join(app.getPath("userData"), "ogar.db"));
  const crypto: SafeStorageAdapter = safeStorage;
  registerIpcHandlers(ipcMain, db, crypto);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
