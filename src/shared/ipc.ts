/**
 * IPC contract shared by the main process, preload bridge, and renderer.
 * This is the single source of truth for channel names and payload shapes.
 */

/** Identity facts read out of the database, surfaced to the renderer. */
export interface AppInfo {
  name: string;
  schemaVersion: number;
}

export interface JiraTicket {
  key: string;
  id: string;
  summary: string;
}

export interface JiraTransition {
  id: string;
  name: string;
}

export interface WorkSession {
  id: number;
  ticketKey: string;
  startedAt: string;
  endedAt: string;
}

export interface RecordWorkSessionInput {
  ticketKey: string;
  startedAt: string;
  endedAt: string;
}

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

export interface CreateWorklogDraftInput {
  ticketKey: string;
  issueId: string;
  timeSpentSeconds: number;
  startedAt: string;
  description: string;
}

export interface DraftSuggestion {
  ticketKey: string;
  issueId: string | null;
  roundedSeconds: number;
  rawSeconds: number;
  startedAt: string;
  date: string;
}

export interface BuildWorklogDraftsInput {
  date: string;
  endDate?: string;
  roundToMinutes?: number;
  description?: string;
}

/** Channel names. Keep stable; the preload and main process both reference these. */
export const IPC = {
  getAppInfo: "app:getInfo",
  getSetting: "settings:get",
  setSetting: "settings:set",
  getSecret: "secrets:get",
  setSecret: "secrets:set",
  getMyOpenTickets: "jira:getMyOpenTickets",
  getActiveTicket: "jira:getActiveTicket",
  setActiveTicket: "jira:setActiveTicket",
  getTransitions: "jira:getTransitions",
  applyTransition: "jira:applyTransition",
  createWorklogDraft: "worklog:createDraft",
  listWorklogDrafts: "worklog:listDrafts",
  submitWorklogDraft: "worklog:submitDraft",
  recordWorkSession: "pomodoro:recordSession",
  listTodaySessions: "pomodoro:listTodaySessions",
  sumTodaySeconds: "pomodoro:sumTodaySeconds",
  buildWorklogDrafts: "worklog:buildFromSessions",
} as const;

/** The typed surface exposed to the renderer via contextBridge as `window.ogar`. */
export interface OgarApi {
  getAppInfo(): Promise<AppInfo>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  getMyOpenTickets(): Promise<JiraTicket[]>;
  getActiveTicket(): Promise<JiraTicket | null>;
  setActiveTicket(ticket: JiraTicket | null): Promise<void>;
  getTransitions(issueKey: string): Promise<JiraTransition[]>;
  applyTransition(issueKey: string, transitionId: string): Promise<void>;
  createWorklogDraft(input: CreateWorklogDraftInput): Promise<number>;
  listWorklogDrafts(status?: WorklogDraftStatus): Promise<WorklogDraft[]>;
  submitWorklogDraft(draftId: number): Promise<void>;
  recordWorkSession(input: RecordWorkSessionInput): Promise<number>;
  listTodaySessions(today: string): Promise<WorkSession[]>;
  buildWorklogDrafts(input: BuildWorklogDraftsInput): Promise<{ suggestions: DraftSuggestion[]; persistedIds: number[] }>;
  sumTodaySeconds(today: string): Promise<number>;
}
