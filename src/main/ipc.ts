import type Database from "better-sqlite3";
import { IPC } from "../shared/ipc.js";
import { readAppInfo } from "./db/database.js";

/**
 * Minimal slice of Electron's `ipcMain` we depend on. Narrowing it keeps this
 * module testable without the Electron runtime.
 */
export interface IpcRegistrar {
  handle(channel: string, listener: (...args: unknown[]) => unknown): void;
}

/** Wires the renderer-facing IPC contract to database reads. */
export function registerIpcHandlers(ipc: IpcRegistrar, db: Database.Database): void {
  ipc.handle(IPC.getAppInfo, () => readAppInfo(db));
}
