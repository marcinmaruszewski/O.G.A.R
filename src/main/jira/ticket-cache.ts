import type Database from "better-sqlite3";
import type { JiraIssue } from "./client.js";

export interface CachedTicket {
  issueId: string;
  summary: string;
}

export function storeTickets(db: Database.Database, issues: JiraIssue[]): void {
  const stmt = db.prepare(
    "INSERT INTO ticket_cache (key, issue_id, summary) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET issue_id = excluded.issue_id, summary = excluded.summary"
  );
  const insertMany = db.transaction((rows: JiraIssue[]) => {
    for (const row of rows) {
      stmt.run(row.key, row.id, row.summary);
    }
  });
  insertMany(issues);
}

export function getTicket(db: Database.Database, key: string): CachedTicket | null {
  const row = db
    .prepare("SELECT issue_id, summary FROM ticket_cache WHERE key = ?")
    .get(key) as { issue_id: string; summary: string } | undefined;
  if (!row) return null;
  return { issueId: row.issue_id, summary: row.summary };
}
