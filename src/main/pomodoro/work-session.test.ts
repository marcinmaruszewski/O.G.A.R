import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../db/migrations.js";
import { migrations } from "../db/schema.js";
import { listTodaySessions, recordSession, sumTodaySeconds } from "./work-session.js";

describe("work-session", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db, migrations);
  });

  afterEach(() => {
    db.close();
  });

  it("recordSession persists a session with ticket, start, and end", () => {
    const id = recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: "2026-06-06T09:00:00.000Z",
      endedAt: "2026-06-06T09:25:00.000Z",
    });

    expect(id).toBeGreaterThan(0);
    const rows = db.prepare("SELECT * FROM work_session WHERE id = ?").all(id) as {
      ticket_key: string;
      started_at: string;
      ended_at: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ticket_key).toBe("PROJ-1");
    expect(rows[0]!.started_at).toBe("2026-06-06T09:00:00.000Z");
    expect(rows[0]!.ended_at).toBe("2026-06-06T09:25:00.000Z");
  });

  it("listTodaySessions returns sessions that ended today (UTC date)", () => {
    const today = "2026-06-06";
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: `${today}T09:00:00.000Z`,
      endedAt: `${today}T09:25:00.000Z`,
    });
    recordSession(db, {
      ticketKey: "PROJ-2",
      startedAt: `${today}T10:00:00.000Z`,
      endedAt: `${today}T10:25:00.000Z`,
    });
    recordSession(db, {
      ticketKey: "PROJ-3",
      startedAt: "2026-06-05T23:00:00.000Z",
      endedAt: "2026-06-05T23:25:00.000Z",
    });

    const sessions = listTodaySessions(db, today);
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.ticketKey).sort()).toEqual(["PROJ-1", "PROJ-2"]);
  });

  it("sumTodaySeconds returns total elapsed seconds for today", () => {
    const today = "2026-06-06";
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: `${today}T09:00:00.000Z`,
      endedAt: `${today}T09:25:00.000Z`, // 25 min = 1500s
    });
    recordSession(db, {
      ticketKey: "PROJ-1",
      startedAt: `${today}T10:00:00.000Z`,
      endedAt: `${today}T10:10:00.000Z`, // 10 min = 600s
    });

    expect(sumTodaySeconds(db, today)).toBe(2100);
  });

  it("sumTodaySeconds returns 0 when there are no sessions today", () => {
    expect(sumTodaySeconds(db, "2026-06-06")).toBe(0);
  });

  it("sessions survive database close and reopen", () => {
    const tmpDb = new Database(":memory:");
    runMigrations(tmpDb, migrations);

    recordSession(tmpDb, {
      ticketKey: "PROJ-99",
      startedAt: "2026-06-06T08:00:00.000Z",
      endedAt: "2026-06-06T08:25:00.000Z",
    });

    const sessions = listTodaySessions(tmpDb, "2026-06-06");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.ticketKey).toBe("PROJ-99");
    tmpDb.close();
  });
});
