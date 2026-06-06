import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDraft, listDraftsByStatus, markSubmitted } from "./worklog-draft.js";
import { migrations } from "../db/schema.js";
import { runMigrations } from "../db/migrations.js";

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  runMigrations(db, migrations);
  return db;
}

describe("worklog-draft", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeDb();
  });

  afterEach(() => {
    db.close();
  });

  it("creates a draft with status pending", () => {
    const id = createDraft(db, {
      ticketKey: "PROJ-42",
      issueId: "10042",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "Did the thing",
    });

    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("lists pending drafts", () => {
    createDraft(db, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 1800,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "A",
    });
    createDraft(db, {
      ticketKey: "PROJ-2",
      issueId: "10002",
      timeSpentSeconds: 3600,
      startedAt: "2026-06-06T10:00:00.000+0000",
      description: "B",
    });

    const drafts = listDraftsByStatus(db, "pending");
    expect(drafts).toHaveLength(2);
    expect(drafts[0]!.ticketKey).toBe("PROJ-1");
    expect(drafts[1]!.ticketKey).toBe("PROJ-2");
  });

  it("marks a draft as submitted with tempo worklog id", () => {
    const id = createDraft(db, {
      ticketKey: "PROJ-1",
      issueId: "10001",
      timeSpentSeconds: 1800,
      startedAt: "2026-06-06T09:00:00.000+0000",
      description: "A",
    });

    markSubmitted(db, id, 99);

    const pending = listDraftsByStatus(db, "pending");
    expect(pending).toHaveLength(0);

    const submitted = listDraftsByStatus(db, "submitted");
    expect(submitted).toHaveLength(1);
    expect(submitted[0]!.tempoWorklogId).toBe(99);
  });

  it("returns the full draft shape on list", () => {
    createDraft(db, {
      ticketKey: "PROJ-99",
      issueId: "10099",
      timeSpentSeconds: 7200,
      startedAt: "2026-06-06T13:00:00.000+0000",
      description: "Long session",
    });

    const drafts = listDraftsByStatus(db, "pending");
    expect(drafts[0]).toMatchObject({
      ticketKey: "PROJ-99",
      issueId: "10099",
      timeSpentSeconds: 7200,
      startedAt: "2026-06-06T13:00:00.000+0000",
      description: "Long session",
      status: "pending",
    });
  });
});
