import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storeTickets, getTicket } from "./ticket-cache.js";

describe("ticket_cache", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(
      "CREATE TABLE ticket_cache (key TEXT PRIMARY KEY, issue_id TEXT NOT NULL, summary TEXT NOT NULL)"
    );
  });

  afterEach(() => db.close());

  it("returns null for a key that has never been stored", () => {
    expect(getTicket(db, "PROJ-1")).toBeNull();
  });

  it("stores tickets and retrieves one by key", () => {
    storeTickets(db, [
      { key: "PROJ-1", id: "10001", summary: "Fix login bug" },
      { key: "PROJ-2", id: "10002", summary: "Add dark mode" },
    ]);

    expect(getTicket(db, "PROJ-1")).toEqual({ issueId: "10001", summary: "Fix login bug" });
    expect(getTicket(db, "PROJ-2")).toEqual({ issueId: "10002", summary: "Add dark mode" });
  });

  it("upserts: re-storing a key updates issueId and summary", () => {
    storeTickets(db, [{ key: "PROJ-1", id: "10001", summary: "Old summary" }]);
    storeTickets(db, [{ key: "PROJ-1", id: "10001", summary: "New summary" }]);

    expect(getTicket(db, "PROJ-1")).toEqual({ issueId: "10001", summary: "New summary" });
  });

  it("storing one key does not affect another", () => {
    storeTickets(db, [{ key: "PROJ-1", id: "10001", summary: "Something" }]);
    expect(getTicket(db, "PROJ-99")).toBeNull();
  });
});
