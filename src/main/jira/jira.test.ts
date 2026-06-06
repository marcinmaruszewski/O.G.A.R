import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMyOpenSprintTickets } from "./jira.js";
import { getTicket } from "./ticket-cache.js";

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("fetchMyOpenSprintTickets", () => {
  let db: Database.Database;
  let fetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(
      "CREATE TABLE ticket_cache (key TEXT PRIMARY KEY, issue_id TEXT NOT NULL, summary TEXT NOT NULL)"
    );
    fetcher = vi.fn();
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  it("runs open-sprint JQL and returns issues", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        issues: [
          { key: "PROJ-1", id: "10001", fields: { summary: "Fix login bug" } },
        ],
      })
    );

    const issues = await fetchMyOpenSprintTickets(
      "https://example.atlassian.net/rest/api/3",
      "user@example.com",
      "tok-abc",
      db,
      fetcher
    );

    expect(issues).toEqual([{ key: "PROJ-1", id: "10001", summary: "Fix login bug" }]);
    const [url] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(encodeURIComponent("assignee = currentUser() AND sprint in openSprints()"));
  });

  it("stores returned tickets in ticket_cache", async () => {
    fetcher.mockResolvedValue(
      makeResponse(200, {
        issues: [
          { key: "PROJ-1", id: "10001", fields: { summary: "Fix login bug" } },
        ],
      })
    );

    await fetchMyOpenSprintTickets(
      "https://example.atlassian.net/rest/api/3",
      "user@example.com",
      "tok-abc",
      db,
      fetcher
    );

    expect(getTicket(db, "PROJ-1")).toEqual({ issueId: "10001", summary: "Fix login bug" });
  });
});
