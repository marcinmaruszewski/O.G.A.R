import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IPC } from "../shared/ipc.js";
import { openDatabase } from "./db/database.js";
import { registerIpcHandlers, type IpcRegistrar } from "./ipc.js";

describe("registerIpcHandlers", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ogar-ipc-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers a handler that returns the app info for the getAppInfo channel", () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const registrar: IpcRegistrar = {
      handle: (channel, listener) => handlers.set(channel, listener),
    };
    const db = openDatabase(join(dir, "ogar.db"));

    registerIpcHandlers(registrar, db);

    const handler = handlers.get(IPC.getAppInfo);
    expect(handler).toBeDefined();
    expect(handler!()).toEqual({ name: "O.G.A.R.", schemaVersion: 1 });
    db.close();
  });
});
