import type Database from "better-sqlite3";

export type WorklogDraftStatus = "pending" | "submitted" | "skipped" | "confirmed" | "failed";

export interface WorklogDraft {
  id: number;
  ticketKey: string;
  issueId: string;
  timeSpentSeconds: number;
  startedAt: string;
  description: string;
  status: WorklogDraftStatus;
  tempoWorklogId: number | null;
  createdAt: string;
}

export interface CreateDraftInput {
  ticketKey: string;
  issueId: string;
  timeSpentSeconds: number;
  startedAt: string;
  description: string;
}

type DraftRow = {
  id: number;
  ticket_key: string;
  issue_id: string;
  time_spent_seconds: number;
  started_at: string;
  description: string;
  status: string;
  tempo_worklog_id: number | null;
  created_at: string;
};

function rowToDraft(row: DraftRow): WorklogDraft {
  return {
    id: row.id,
    ticketKey: row.ticket_key,
    issueId: row.issue_id,
    timeSpentSeconds: row.time_spent_seconds,
    startedAt: row.started_at,
    description: row.description,
    status: row.status as WorklogDraftStatus,
    tempoWorklogId: row.tempo_worklog_id,
    createdAt: row.created_at,
  };
}

export function createDraft(db: Database.Database, input: CreateDraftInput): number {
  const result = db
    .prepare(
      `INSERT INTO worklog_draft (ticket_key, issue_id, time_spent_seconds, started_at, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.ticketKey, input.issueId, input.timeSpentSeconds, input.startedAt, input.description);
  return result.lastInsertRowid as number;
}

export function listDraftsByStatus(db: Database.Database, status: WorklogDraftStatus): WorklogDraft[] {
  const rows = db
    .prepare(
      `SELECT id, ticket_key, issue_id, time_spent_seconds, started_at, description, status, tempo_worklog_id, created_at
       FROM worklog_draft WHERE status = ? ORDER BY created_at ASC`
    )
    .all(status) as DraftRow[];
  return rows.map(rowToDraft);
}

export function markSubmitted(db: Database.Database, id: number, tempoWorklogId: number): void {
  db.prepare(
    `UPDATE worklog_draft SET status = 'submitted', tempo_worklog_id = ? WHERE id = ?`
  ).run(tempoWorklogId, id);
}

export function markSkipped(db: Database.Database, id: number): void {
  db.prepare(`UPDATE worklog_draft SET status = 'skipped' WHERE id = ?`).run(id);
}

export function markConfirmed(db: Database.Database, id: number, tempoWorklogId: number): void {
  db.prepare(
    `UPDATE worklog_draft SET status = 'confirmed', tempo_worklog_id = ? WHERE id = ?`
  ).run(tempoWorklogId, id);
}

export function markFailed(db: Database.Database, id: number): void {
  db.prepare(`UPDATE worklog_draft SET status = 'failed' WHERE id = ?`).run(id);
}
