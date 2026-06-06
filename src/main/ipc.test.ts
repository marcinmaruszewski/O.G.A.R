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
    expect(handler!()).toEqual({ name: "O.G.A.R.", schemaVersion: 6 });
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

  it("jira:getTransitions handler returns transitions for the given issue key", async () => {
    const { handlers, registrar, db } = makeSetup(dir);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          transitions: [
            { id: "21", name: "In Progress" },
            { id: "31", name: "Done" },
          ],
        }),
    } as unknown as Response);

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");

    const handler = handlers.get(IPC.getTransitions);
    expect(handler).toBeDefined();
    const result = await handler!(_event, "PROJ-1");
    expect(result).toEqual([
      { id: "21", name: "In Progress" },
      { id: "31", name: "Done" },
    ]);
    db.close();
  });

  it("jira:applyTransition handler posts the transition and resolves", async () => {
    const { handlers, registrar, db } = makeSetup(dir);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as unknown as Response);

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");

    const handler = handlers.get(IPC.applyTransition);
    expect(handler).toBeDefined();
    await expect(handler!(_event, "PROJ-1", "21")).resolves.toBeUndefined();

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("PROJ-1/transitions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ transition: { id: "21" } });
    db.close();
  });

  it("worklog:createDraft creates a draft and returns its id", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    const handler = handlers.get(IPC.createWorklogDraft);
    expect(handler).toBeDefined();

    const id = handler!(_event, {
      ticketKey: "PROJ-42",
      issueId: "10042",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Did the thing",
    });
    expect(typeof id).toBe("number");
    expect(id as number).toBeGreaterThan(0);
    db.close();
  });

  it("worklog:listDrafts returns pending drafts", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.createWorklogDraft)!(_event, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 1800,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "A",
    });

    const drafts = handlers.get(IPC.listWorklogDrafts)!(_event) as Array<{ ticketKey: string }>;
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.ticketKey).toBe("PROJ-1");
    db.close();
  });

  it("worklog:submitDraft posts to Tempo, confirms via read-back, and marks draft confirmed", async () => {
    const { handlers, registrar, db } = makeSetup(dir);

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        // getMyself
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ accountId: "acc-xyz" }),
        });
      }
      if (url.includes("worklogs") && callCount === 2) {
        // pre-submit listWorklogs — no existing worklogs
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: [] }),
        });
      }
      if (callCount === 3) {
        // postWorklog
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tempoWorklogId: 99 }),
        });
      }
      // post-submit listWorklogs read-back — entry confirmed
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            results: [{ tempoWorklogId: 99, issueId: "10042", timeSpentSeconds: 3600, startDate: "2026-06-06" }],
          }),
      });
    });

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");
    handlers.get(IPC.setSecret)!(_event, "tempoToken", "tempo-tok");
    handlers.get(IPC.setSetting)!(_event, "tempoBaseUrl", "https://api.tempo.io/4");

    const draftId = handlers.get(IPC.createWorklogDraft)!(_event, {
      ticketKey: "PROJ-42",
      issueId: "10042",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Did the thing",
    }) as number;

    await handlers.get(IPC.submitWorklogDraft)!(_event, draftId);

    const pending = handlers.get(IPC.listWorklogDrafts)!(_event) as Array<{ status: string }>;
    expect(pending).toHaveLength(0);

    const confirmed = handlers.get(IPC.listWorklogDrafts)!(_event, "confirmed") as Array<{ status: string; tempoWorklogId: number }>;
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]!.tempoWorklogId).toBe(99);
    db.close();
  });

  it("worklog:submitDraft marks draft skipped when duplicate already exists in Tempo", async () => {
    const { handlers, registrar, db } = makeSetup(dir);

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getMyself
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ accountId: "acc-xyz" }),
        });
      }
      // pre-submit listWorklogs — duplicate already exists
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            results: [{ tempoWorklogId: 77, issueId: "10001", timeSpentSeconds: 1800, startDate: "2026-06-06" }],
          }),
      });
    });

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");
    handlers.get(IPC.setSecret)!(_event, "tempoToken", "tempo-tok");
    handlers.get(IPC.setSetting)!(_event, "tempoBaseUrl", "https://api.tempo.io/4");

    const draftId = handlers.get(IPC.createWorklogDraft)!(_event, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 1800,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Already logged",
    }) as number;

    await handlers.get(IPC.submitWorklogDraft)!(_event, draftId);

    // Should only have called getMyself + one listWorklogs — no postWorklog
    expect(callCount).toBe(2);

    const pending = handlers.get(IPC.listWorklogDrafts)!(_event) as Array<{ status: string }>;
    expect(pending).toHaveLength(0);

    const skipped = handlers.get(IPC.listWorklogDrafts)!(_event, "skipped") as Array<{ status: string }>;
    expect(skipped).toHaveLength(1);
    db.close();
  });

  it("worklog:submitDraft marks draft failed when post-submit read-back does not confirm the entry", async () => {
    const { handlers, registrar, db } = makeSetup(dir);

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ accountId: "acc-xyz" }),
        });
      }
      if (callCount === 2) {
        // pre-submit — no existing
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) });
      }
      if (callCount === 3) {
        // postWorklog succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ tempoWorklogId: 55 }),
        });
      }
      // post-submit read-back — empty (not confirmed)
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) });
    });

    registerIpcHandlers(registrar, db, stubCrypto(), fetcher);

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");
    handlers.get(IPC.setSecret)!(_event, "tempoToken", "tempo-tok");
    handlers.get(IPC.setSetting)!(_event, "tempoBaseUrl", "https://api.tempo.io/4");

    const draftId = handlers.get(IPC.createWorklogDraft)!(_event, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Unconfirmed",
    }) as number;

    await handlers.get(IPC.submitWorklogDraft)!(_event, draftId);

    const failed = handlers.get(IPC.listWorklogDrafts)!(_event, "failed") as Array<{ status: string }>;
    expect(failed).toHaveLength(1);
    db.close();
  });

  it("worklog:submitDraft throws when Tempo is not configured", async () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.setSetting)!(_event, "jiraBaseUrl", "https://example.atlassian.net/rest/api/3");
    handlers.get(IPC.setSecret)!(_event, "jiraEmail", "user@example.com");
    handlers.get(IPC.setSecret)!(_event, "jiraToken", "tok-abc");

    const draftId = handlers.get(IPC.createWorklogDraft)!(_event, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 1800,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "A",
    }) as number;

    await expect(handlers.get(IPC.submitWorklogDraft)!(_event, draftId)).rejects.toThrow(
      /tempo/i
    );
    db.close();
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

  it("pomodoro:recordSession persists a work session and returns its id", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    const handler = handlers.get(IPC.recordWorkSession);
    expect(handler).toBeDefined();
    const id = handler!(_event, {
      ticketKey: "PROJ-42",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z",
    });
    expect(typeof id).toBe("number");
    expect(id as number).toBeGreaterThan(0);
    db.close();
  });

  it("pomodoro:listTodaySessions returns sessions for the given date", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.recordWorkSession)!(_event, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z",
    });

    const sessions = handlers.get(IPC.listTodaySessions)!(_event, "2026-06-06") as Array<{ ticketKey: string }>;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.ticketKey).toBe("PROJ-1");
    db.close();
  });

  it("pomodoro:sumTodaySeconds returns total elapsed seconds for today", () => {
    const { handlers, registrar, db } = makeSetup(dir);
    registerIpcHandlers(registrar, db, stubCrypto());

    handlers.get(IPC.recordWorkSession)!(_event, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z", // 1500s
    });

    const total = handlers.get(IPC.sumTodaySeconds)!(_event, "2026-06-06") as number;
    expect(total).toBe(1500);
    db.close();
  });
});

const _event = {} as Electron.IpcMainInvokeEvent;
