import type { TempoWorklog } from "./client.js";
import type { WorklogDraft } from "./worklog-draft.js";

export interface DeduplicateResult {
  toSubmit: WorklogDraft[];
  toSkip: WorklogDraft[];
}

function isDuplicate(draft: WorklogDraft, existing: TempoWorklog[]): boolean {
  const draftDate = draft.startedAt.slice(0, 10);
  return existing.some(
    (w) => w.issueId === draft.issueId && w.startDate === draftDate && w.timeSpentSeconds === draft.timeSpentSeconds
  );
}

export function deduplicateDrafts(drafts: WorklogDraft[], existing: TempoWorklog[]): DeduplicateResult {
  const toSubmit: WorklogDraft[] = [];
  const toSkip: WorklogDraft[] = [];
  for (const draft of drafts) {
    if (isDuplicate(draft, existing)) {
      toSkip.push(draft);
    } else {
      toSubmit.push(draft);
    }
  }
  return { toSubmit, toSkip };
}

export function verifySubmission(draft: WorklogDraft, readBack: TempoWorklog[]): "confirmed" | "failed" {
  return isDuplicate(draft, readBack) ? "confirmed" : "failed";
}
