import type Database from "better-sqlite3";
import { JiraClient, type JiraIssue } from "./client.js";
import { storeTickets } from "./ticket-cache.js";

const OPEN_SPRINT_JQL = "assignee = currentUser() AND sprint in openSprints()";

export async function fetchMyOpenSprintTickets(
  baseUrl: string,
  email: string,
  token: string,
  db: Database.Database,
  fetcher?: typeof fetch
): Promise<JiraIssue[]> {
  const client = new JiraClient(baseUrl, email, token, fetcher);
  const issues = await client.searchIssues(OPEN_SPRINT_JQL);
  storeTickets(db, issues);
  return issues;
}
