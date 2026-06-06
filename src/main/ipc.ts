import type Database from "better-sqlite3";
import { IPC } from "../shared/ipc.js";
import { readAppInfo } from "./db/database.js";
import { JiraClient } from "./jira/client.js";
import { fetchMyOpenSprintTickets } from "./jira/jira.js";
import { SecretStore, type SafeStorageAdapter } from "./settings/secret-store.js";
import { getSetting, setSetting } from "./settings/settings.js";
import { TempoClient } from "./tempo/client.js";
import {
  createDraft,
  listDraftsByStatus,
  markSubmitted,
  type WorklogDraftStatus,
} from "./tempo/worklog-draft.js";

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

  function requireJiraClient(): JiraClient {
    const baseUrl = getSetting(db, "jiraBaseUrl");
    const email = secrets.get("jiraEmail");
    const token = secrets.get("jiraToken");
    if (!baseUrl || !email || !token) {
      throw new Error("Jira is not configured — set jiraBaseUrl, jiraEmail, and jiraToken in settings");
    }
    return new JiraClient(baseUrl, email, token, fetcher);
  }

  ipc.handle(IPC.getTransitions, async (_e, ...args) => {
    const issueKey = args[0] as string;
    return requireJiraClient().getTransitions(issueKey);
  });

  ipc.handle(IPC.applyTransition, async (_e, ...args) => {
    const issueKey = args[0] as string;
    const transitionId = args[1] as string;
    return requireJiraClient().applyTransition(issueKey, transitionId);
  });

  ipc.handle(IPC.createWorklogDraft, (_e, ...args) => {
    const input = args[0] as import("../shared/ipc.js").CreateWorklogDraftInput;
    return createDraft(db, input);
  });

  ipc.handle(IPC.listWorklogDrafts, (_e, ...args) => {
    const status = (args[0] as WorklogDraftStatus | undefined) ?? "pending";
    return listDraftsByStatus(db, status);
  });

  ipc.handle(IPC.submitWorklogDraft, async (_e, ...args) => {
    const draftId = args[0] as number;

    const tempoToken = secrets.get("tempoToken");
    const tempoBaseUrl = getSetting(db, "tempoBaseUrl");
    if (!tempoToken || !tempoBaseUrl) {
      throw new Error("Tempo is not configured — set tempoToken and tempoBaseUrl in settings");
    }

    const jiraClient = requireJiraClient();
    const { accountId } = await jiraClient.getMyself();

    const [draft] = listDraftsByStatus(db, "pending").filter((d) => d.id === draftId);
    if (!draft) throw new Error(`Worklog draft ${draftId} not found or already submitted`);

    const tempoClient = new TempoClient(tempoToken, tempoBaseUrl, fetcher);
    const tempoWorklogId = await tempoClient.postWorklog({
      issueId: draft.issueId,
      accountId,
      timeSpentSeconds: draft.timeSpentSeconds,
      startedAt: draft.startedAt,
      description: draft.description,
    });

    markSubmitted(db, draftId, tempoWorklogId);
  });
}
