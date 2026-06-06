import type Database from "better-sqlite3";

export interface WorkSession {
  id: number;
  ticketKey: string;
  startedAt: string;
  endedAt: string;
}

export interface RecordSessionInput {
  ticketKey: string;
  startedAt: string;
  endedAt: string;
}

export function recordSession(db: Database.Database, input: RecordSessionInput): number {
  const result = db
    .prepare(
      "INSERT INTO work_session (ticket_key, started_at, ended_at) VALUES (?, ?, ?)"
    )
    .run(input.ticketKey, input.startedAt, input.endedAt);
  return result.lastInsertRowid as number;
}

export function listTodaySessions(db: Database.Database, today: string): WorkSession[] {
  const rows = db
    .prepare(
      "SELECT id, ticket_key, started_at, ended_at FROM work_session WHERE ended_at LIKE ? ORDER BY started_at ASC"
    )
    .all(`${today}%`) as { id: number; ticket_key: string; started_at: string; ended_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    ticketKey: r.ticket_key,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  }));
}

export function sumTodaySeconds(db: Database.Database, today: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(
        CAST(round((julianday(ended_at) - julianday(started_at)) * 86400) AS INTEGER)
      ), 0) AS total
      FROM work_session
      WHERE ended_at LIKE ?`
    )
    .get(`${today}%`) as { total: number };
  return row.total;
}
