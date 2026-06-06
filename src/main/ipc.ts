import type Database from "better-sqlite3";
import { IPC } from "../shared/ipc.js";
import { readAppInfo } from "./db/database.js";
import { fetchMyOpenSprintTickets } from "./jira/jira.js";
import { SecretStore, type SafeStorageAdapter } from "./settings/secret-store.js";
import { getSetting, setSetting } from "./settings/settings.js";

export interface IpcRegistrar {
  handle(channel: string, listener: (...args: unknown[]) => unknown): void;
}

export function registerIpcHandlers(
  ipc: IpcRegistrar,
  db: Database.Database,
  crypto: SafeStorageAdapter,
  fetcher?: typeof fetch
): void {
  const secrets = new SecretStore(db, crypto);

  ipc.handle(IPC.getAppInfo, () => readAppInfo(db));
  ipc.handle(IPC.getSetting, (_e, ...args) => getSetting(db, args[0] as string));
  ipc.handle(IPC.setSetting, (_e, ...args) => setSetting(db, args[0] as string, args[1] as string));
  ipc.handle(IPC.getSecret, (_e, ...args) => secrets.get(args[0] as string));
  ipc.handle(IPC.setSecret, (_e, ...args) => secrets.set(args[0] as string, args[1] as string));
  ipc.handle(IPC.getActiveTicket, () => {
    const raw = getSetting(db, "activeTicket");
    return raw ? JSON.parse(raw) : null;
  });
  ipc.handle(IPC.setActiveTicket, (_e, ...args) => {
    const ticket = args[0] as import("../shared/ipc.js").JiraTicket | null;
    if (ticket === null) {
      setSetting(db, "activeTicket", "");
    } else {
      setSetting(db, "activeTicket", JSON.stringify(ticket));
    }
  });
  ipc.handle(IPC.getMyOpenTickets, async () => {
    const baseUrl = getSetting(db, "jiraBaseUrl");
    const email = secrets.get("jiraEmail");
    const token = secrets.get("jiraToken");
    if (!baseUrl || !email || !token) {
      throw new Error("Jira is not configured — set jiraBaseUrl, jiraEmail, and jiraToken in settings");
    }
    return fetchMyOpenSprintTickets(baseUrl, email, token, db, fetcher);
  });
}
