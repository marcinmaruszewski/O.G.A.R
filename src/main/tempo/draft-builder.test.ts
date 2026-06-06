import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../db/migrations.js";
import { migrations } from "../db/schema.js";
import { storeTickets } from "../jira/ticket-cache.js";
import { recordSession } from "../pomodoro/work-session.js";
import { listDraftsByStatus } from "./worklog-draft.js";
import {
  aggregateSessions,
  buildDraftSuggestionsForDate,
  buildDraftSuggestionsForRange,
  persistDraftSuggestions,
  roundUpSeconds,
} from "./draft-builder.js";

describe("roundUpSeconds", () => {
  it("returns same value when already a multiple", () => {
    expect(roundUpSeconds(900, 15)).toBe(900);
    expect(roundUpSeconds(1800, 15)).toBe(1800);
    expect(roundUpSeconds(0, 15)).toBe(0);
  });

  it("rounds up to next multiple when not exact", () => {
    expect(roundUpSeconds(1, 15)).toBe(900);
    expect(roundUpSeconds(899, 15)).toBe(900);
    expect(roundUpSeconds(901, 15)).toBe(1800);
  });

  it("works with custom rounding increments", () => {
    expect(roundUpSeconds(600, 30)).toBe(1800);
    expect(roundUpSeconds(1800, 30)).toBe(1800);
    expect(roundUpSeconds(1801, 30)).toBe(3600);
  });
});

describe("aggregateSessions", () => {
  it("returns empty array for no sessions", () => {
    expect(aggregateSessions([])).toEqual([]);
  });

  it("sums seconds for a single ticket", () => {
    const sessions = [
      { id: 1, ticketKey: "PROJ-1", startedAt: "2026-06-06T09:00:00.000Z", endedAt: "2026-06-06T09:25:00.000Z" },
      { id: 2, ticketKey: "PROJ-1", startedAt: "2026-06-06T10:00:00.000Z", endedAt: "2026-06-06T10:10:00.000Z" },
    ];
    const result = aggregateSessions(sessions);
    expect(result).toHaveLength(1);
    expect(result[0]!.ticketKey).toBe("PROJ-1");
    expect(result[0]!.totalSeconds).toBe(25 * 60 + 10 * 60); // 2100
    expect(result[0]!.earliestStart).toBe("2026-06-06T09:00:00.000Z");
  });

  it("groups multiple tickets independently", () => {
    const sessions = [
      { id: 1, ticketKey: "PROJ-1", startedAt: "2026-06-06T09:00:00.000Z", endedAt: "2026-06-06T09:25:00.000Z" },
      { id: 2, ticketKey: "PROJ-2", startedAt: "2026-06-06T10:00:00.000Z", endedAt: "2026-06-06T10:30:00.000Z" },
    ];
    const result = aggregateSessions(sessions);
    expect(result).toHaveLength(2);
    const keys = result.map((r) => r.ticketKey).sort();
    expect(keys).toEqual(["PROJ-1", "PROJ-2"]);
  });

  it("picks the earliest start across multiple sessions for one ticket", () => {
    const sessions = [
      { id: 1, ticketKey: "PROJ-1", startedAt: "2026-06-06T10:00:00.000Z", endedAt: "2026-06-06T10:25:00.000Z" },
      { id: 2, ticketKey: "PROJ-1", startedAt: "2026-06-06T09:00:00.000Z", endedAt: "2026-06-06T09:10:00.000Z" },
    ];
    const result = aggregateSessions(sessions);
    expect(result[0]!.earliestStart).toBe("2026-06-06T09:00:00.000Z");
  });
});

describe("buildDraftSuggestionsForDate", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db, migrations);
  });

  afterEach(() => {
    db.close();
  });

  it("returns empty array when no sessions exist for the date", () => {
    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06");
    expect(suggestions).toEqual([]);
  });

  it("aggregates sessions for a date and applies default 15-minute rounding", () => {
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:20:00.000Z", // 20 min = 1200s → rounds to 1800s
    });
    storeTickets(db, [{ key: "PROJ-1", id: "10001", summary: "Some ticket" }]);

    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.ticketKey).toBe("PROJ-1");
    expect(suggestions[0]!.issueId).toBe("10001");
    expect(suggestions[0]!.rawSeconds).toBe(1200);
    expect(suggestions[0]!.roundedSeconds).toBe(1800);
  });

  it("sets issueId to null when ticket not in cache", () => {
    recordSession(db, {
      ticketKey: "UNKNOWN-99",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z",
    });

    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06");
    expect(suggestions[0]!.issueId).toBeNull();
  });

  it("excludes sessions from other dates", () => {
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-05T09:00:00.000Z",
      endedAt: "2026-06-05T09:25:00.000Z",
    });

    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06");
    expect(suggestions).toHaveLength(0);
  });

  it("respects custom rounding increment", () => {
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:20:00.000Z", // 20 min = 1200s → rounds to 30 min = 1800s with 30-min rounding
    });

    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06", 30);
    expect(suggestions[0]!.roundedSeconds).toBe(1800);
  });

  it("combines multiple sessions for the same ticket into one suggestion", () => {
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z", // 25 min
    });
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T10:00:00.000Z",
      endedAt: "2026-06-06T10:10:00.000Z", // 10 min
    });

    const suggestions = buildDraftSuggestionsForDate(db, "2026-06-06");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.rawSeconds).toBe(2100); // 35 min total
    expect(suggestions[0]!.roundedSeconds).toBe(2700); // 45 min rounded
  });
});

describe("buildDraftSuggestionsForRange", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db, migrations);
  });

  afterEach(() => {
    db.close();
  });

  it("returns suggestions for each day in range with sessions", () => {
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-04T09:00:00.000Z",
      endedAt: "2026-06-04T09:25:00.000Z",
    });
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T10:00:00.000Z",
      endedAt: "2026-06-06T10:30:00.000Z",
    });
    storeTickets(db, [{ key: "PROJ-1", id: "10001", summary: "Some ticket" }]);

    const suggestions = buildDraftSuggestionsForRange(db, "2026-06-04", "2026-06-06");
    const dates = suggestions.map((s) => s.date).sort();
    expect(dates).toEqual(["2026-06-04", "2026-06-06"]);
  });

  it("returns empty when no sessions in range", () => {
    const suggestions = buildDraftSuggestionsForRange(db, "2026-06-01", "2026-06-03");
    expect(suggestions).toEqual([]);
  });
});

describe("persistDraftSuggestions", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db, migrations);
  });

  afterEach(() => {
    db.close();
  });

  it("creates worklog_draft records for suggestions with known issueId", () => {
    const suggestions = [
      {
        ticketKey: "PROJ-1",
        issueId: "10001",
        roundedSeconds: 1800,
        rawSeconds: 1200,
        startedAt: "2026-06-06T09:00:00.000Z",
        date: "2026-06-06",
      },
    ];

    const ids = persistDraftSuggestions(db, suggestions, "Auto-generated from Pomodoro sessions");
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBeGreaterThan(0);

    const drafts = listDraftsByStatus(db, "pending");
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.ticketKey).toBe("PROJ-1");
    expect(drafts[0]!.timeSpentSeconds).toBe(1800);
    expect(drafts[0]!.description).toBe("Auto-generated from Pomodoro sessions");
  });

  it("skips suggestions without issueId", () => {
    const suggestions = [
      {
        ticketKey: "UNKNOWN-99",
        issueId: null,
        roundedSeconds: 900,
        rawSeconds: 600,
        startedAt: "2026-06-06T09:00:00.000Z",
        date: "2026-06-06",
      },
    ];

    const ids = persistDraftSuggestions(db, suggestions, "Auto");
    expect(ids).toHaveLength(0);
    expect(listDraftsByStatus(db, "pending")).toHaveLength(0);
  });

  it("returns ids only for persisted drafts when mix of known and unknown tickets", () => {
    const suggestions = [
      {
        ticketKey: "PROJ-1",
        issueId: "10001",
        roundedSeconds: 1800,
        rawSeconds: 1200,
        startedAt: "2026-06-06T09:00:00.000Z",
        date: "2026-06-06",
      },
      {
        ticketKey: "UNKNOWN-99",
        issueId: null,
        roundedSeconds: 900,
        rawSeconds: 900,
        startedAt: "2026-06-06T10:00:00.000Z",
        date: "2026-06-06",
      },
    ];

    const ids = persistDraftSuggestions(db, suggestions, "Auto");
    expect(ids).toHaveLength(1);
    expect(listDraftsByStatus(db, "pending")).toHaveLength(1);
  });
});
