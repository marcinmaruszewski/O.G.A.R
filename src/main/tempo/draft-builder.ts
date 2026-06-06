import type Database from "better-sqlite3";
import { getTicket } from "../jira/ticket-cache.js";
import { listTodaySessions, type WorkSession } from "../pomodoro/work-session.js";
import { createDraft } from "./worklog-draft.js";

const DEFAULT_ROUND_MINUTES = 15;

export function roundUpSeconds(seconds: number, roundToMinutes: number): number {
  if (seconds === 0) return 0;
  const bucket = roundToMinutes * 60;
  return Math.ceil(seconds / bucket) * bucket;
}

export interface AggregatedSession {
  ticketKey: string;
  totalSeconds: number;
  earliestStart: string;
}

export function aggregateSessions(sessions: WorkSession[]): AggregatedSession[] {
  const map = new Map<string, { totalSeconds: number; earliestStart: string }>();
  for (const s of sessions) {
    const durationMs = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
    const seconds = Math.round(durationMs / 1000);
    const existing = map.get(s.ticketKey);
    if (!existing) {
      map.set(s.ticketKey, { totalSeconds: seconds, earliestStart: s.startedAt });
    } else {
      existing.totalSeconds += seconds;
      if (s.startedAt < existing.earliestStart) {
        existing.earliestStart = s.startedAt;
      }
    }
  }
  return Array.from(map.entries()).map(([ticketKey, v]) => ({
    ticketKey,
    totalSeconds: v.totalSeconds,
    earliestStart: v.earliestStart,
  }));
}

export interface DraftSuggestion {
  ticketKey: string;
  issueId: string | null;
  roundedSeconds: number;
  rawSeconds: number;
  startedAt: string;
  date: string;
}

export function buildDraftSuggestionsForDate(
  db: Database.Database,
  date: string,
  roundToMinutes = DEFAULT_ROUND_MINUTES
): DraftSuggestion[] {
  const sessions = listTodaySessions(db, date);
  const aggregated = aggregateSessions(sessions);
  return aggregated.map((agg) => {
    const cached = getTicket(db, agg.ticketKey);
    return {
      ticketKey: agg.ticketKey,
      issueId: cached?.issueId ?? null,
      rawSeconds: agg.totalSeconds,
      roundedSeconds: roundUpSeconds(agg.totalSeconds, roundToMinutes),
      startedAt: agg.earliestStart,
      date,
    };
  });
}

export function buildDraftSuggestionsForRange(
  db: Database.Database,
  startDate: string,
  endDate: string,
  roundToMinutes = DEFAULT_ROUND_MINUTES
): DraftSuggestion[] {
  const result: DraftSuggestion[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    result.push(...buildDraftSuggestionsForDate(db, date, roundToMinutes));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

export function persistDraftSuggestions(
  db: Database.Database,
  suggestions: DraftSuggestion[],
  description: string
): number[] {
  const ids: number[] = [];
  for (const s of suggestions) {
    if (s.issueId === null) continue;
    const id = createDraft(db, {
      ticketKey: s.ticketKey,
      issueId: s.issueId,
      timeSpentSeconds: s.roundedSeconds,
      startedAt: s.startedAt,
      description,
    });
    ids.push(id);
  }
  return ids;
}
