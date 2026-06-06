import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(handler!()).toEqual({ name: "O.G.A.R.", schemaVersion: 4 });
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

  it("getActiveTicket returns null when no ticket has been set", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    const result = handlers.get(IPC.getActiveTicket)!(_event);
    expect(result).toBeNull();
    db.close();
  });

  it("setActiveTicket stores a ticket and getActiveTicket retrieves it", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    const ticket = { key: "PROJ-42", id: "10042", summary: "Build active ticket feature" };
    handlers.get(IPC.setActiveTicket)!(_event, ticket);
    const result = handlers.get(IPC.getActiveTicket)!(_event);
    expect(result).toEqual(ticket);
    db.close();
  });

  it("setActiveTicket(null) clears the active ticket", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.setActiveTicket)!(_event, { key: "PROJ-42", id: "10042", summary: "Something" });
    handlers.get(IPC.setActiveTicket)!(_event, null);
    const result = handlers.get(IPC.getActiveTicket)!(_event);
    expect(result).toBeNull();
    db.close();
  });

  it("active ticket persists across database close and reopen", () => {
    const dbPath = join(dir, "ogar.db");
    const ticket = { key: "PROJ-99", id: "10099", summary: "Persisted ticket" };

    const setup1 = makeSetup(dir);
    registerIpcHandlers(setup1.registrar, setup1.db, stubCrypto());
    setup1.handlers.get(IPC.setActiveTicket)!(_event, ticket);
    setup1.db.close();

    const setup2 = makeSetup(dir);
    registerIpcHandlers(setup2.registrar, setup2.db, stubCrypto());
    const result = setup2.handlers.get(IPC.getActiveTicket)!(_event);
    expect(result).toEqual(ticket);
    setup2.db.close();
  });

  it("jira:getMyOpenTickets handler returns tickets from Jira", async () => {
    const { handlers, registrar, db } = makeSetup(dir);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          issues: [
            { key: "PROJ-1", id: "10001", fields: { summary: "Fix login bug" } },
          ],
        }),
    } as unknown as Response);

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    // Store credentials via IPC handlers
    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");

    const handler = handlers.get(IPC.getMyOpenTickets);
    expect(handler).toBeDefined();
    const result = await handler!(_event);
    expect(result).toEqual([{ key: "PROJ-1", id: "10001", summary: "Fix login bug" }]);
    db.close();
  });
});

const _event = {} as Electron.IpcMainInvokeEvent;
