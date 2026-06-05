import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IPC } from "../shared/ipc.js";
import { openDatabase } from "./db/database.js";
import { registerIpcHandlers, type IpcRegistrar } from "./ipc.js";
import type { SafeStorageAdapter } from "./settings/secret-store.js";

const stubCrypto = (): SafeStorageAdapter => ({
  isEncryptionAvailable: () => true,
  encryptString: (p) => Buffer.from(`enc:${p}`),
  decryptString: (b) => b.toString().replace(/^enc:/, ""),
});

function makeSetup(dir: string) {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registrar: IpcRegistrar = {
    handle: (channel, listener) => handlers.set(channel, listener),
  };
  const db = openDatabase(join(dir, "ogar.db"));
  return { handlers, registrar, db };
}

describe("registerIpcHandlers", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ogar-ipc-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers a handler that returns the app info for the getAppInfo channel", () => {
    const { handlers, registrar, db } = makeSetup(dir);

    registerIpcHandlers(registrar, db, stubCrypto());

    const handler = handlers.get(IPC.getAppInfo);
    expect(handler).toBeDefined();
    expect(handler!()).toEqual({ name: "O.G.A.R.", schemaVersion: 3 });
    db.close();
  });

  it("setSetting stores and getSetting retrieves a non-secret value", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://dentsu-emea.atlassian.net/rest/api/3");
    const result = handlers.get(IPC.getSetting)!(_event, "jiraBaseUrl");
    expect(result).toBe("https://dentsu-emea.atlassian.net/rest/api/3");
    db.close();
  });

  it("setSecret stores and getSecret retrieves a decrypted token", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-xyz");
    const result = handlers.get(IPC.getSecret)!(_event, "jiraToken");
    expect(result).toBe("tok-xyz");
    db.close();
  });
});

const _event = {} as Electron.IpcMainInvokeEvent;
