import { describe, expect, it } from "vitest";
import { deduplicateDrafts, verifySubmission } from "./reconciler.js";
import type { WorklogDraft } from "./worklog-draft.js";
import type { TempoWorklog } from "./client.js";

function makeDraft(overrides: Partial<WorklogDraft> = {}): WorklogDraft {
  return {
    id: 1,
    ticketKey: "PROJ-1",
    issueId: "10001",
    timeSpentSeconds: 3600,
    startedAt: "2026-06-06T09:00:00.000+0000",
    description: "work",
    status: "pending",
    tempoWorklogId: null,
    createdAt: "2026-06-06T09:00:00.000Z",
    ...overrides,
  };
}

function makeTempoWorklog(overrides: Partial<TempoWorklog> = {}): TempoWorklog {
  return {
    tempoWorklogId: 100,
    issueId: "10001",
    timeSpentSeconds: 3600,
    startDate: "2026-06-06",
    ...overrides,
  };
}

describe("deduplicateDrafts", () => {
  it("returns all drafts when no existing worklogs", () => {
    const drafts = [makeDraft({ id: 1 }), makeDraft({ id: 2, issueId: "10002" })];
    const { toSubmit, toSkip } = deduplicateDrafts(drafts, []);
    expect(toSubmit).toHaveLength(2);
    expect(toSkip).toHaveLength(0);
  });

  it("skips drafts that match an existing worklog by issueId+date+timeSpentSeconds", () => {
    const draft = makeDraft({ issueId: "10001", timeSpentSeconds: 3600, startedAt: "2026-06-06T09:00:00.000+0000" });
    const existing = [makeTempoWorklog({ issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" })];

    const { toSubmit, toSkip } = deduplicateDrafts([draft], existing);

    expect(toSubmit).toHaveLength(0);
    expect(toSkip).toHaveLength(1);
    expect(toSkip[0]!.id).toBe(draft.id);
  });

  it("does not skip draft with matching issueId+date but different time", () => {
    const draft = makeDraft({ issueId: "10001", timeSpentSeconds: 7200, startedAt: "2026-06-06T09:00:00.000+0000" });
    const existing = [makeTempoWorklog({ issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" })];

    const { toSubmit, toSkip } = deduplicateDrafts([draft], existing);

    expect(toSubmit).toHaveLength(1);
    expect(toSkip).toHaveLength(0);
  });

  it("does not skip draft with matching issueId+time but different date", () => {
    const draft = makeDraft({ issueId: "10001", timeSpentSeconds: 3600, startedAt: "2026-06-07T09:00:00.000+0000" });
    const existing = [makeTempoWorklog({ issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" })];

    const { toSubmit, toSkip } = deduplicateDrafts([draft], existing);

    expect(toSubmit).toHaveLength(1);
    expect(toSkip).toHaveLength(0);
  });

  it("handles mixed batch — some new, some duplicate", () => {
    const drafts = [
      makeDraft({ id: 1, issueId: "10001", timeSpentSeconds: 3600, startedAt: "2026-06-06T09:00:00.000+0000" }),
      makeDraft({ id: 2, issueId: "10002", timeSpentSeconds: 1800, startedAt: "2026-06-06T11:00:00.000+0000" }),
    ];
    const existing = [makeTempoWorklog({ issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" })];

    const { toSubmit, toSkip } = deduplicateDrafts(drafts, existing);

    expect(toSubmit.map((d) => d.id)).toEqual([2]);
    expect(toSkip.map((d) => d.id)).toEqual([1]);
  });
});

describe("verifySubmission", () => {
  it("returns confirmed when worklog appears in read-back", () => {
    const draft = makeDraft({ issueId: "10001", timeSpentSeconds: 3600, startedAt: "2026-06-06T09:00:00.000+0000" });
    const existing = [makeTempoWorklog({ issueId: "10001", timeSpentSeconds: 3600, startDate: "2026-06-06" })];

    expect(verifySubmission(draft, existing)).toBe("confirmed");
  });

  it("returns failed when worklog is missing from read-back", () => {
    const draft = makeDraft({ issueId: "10001", timeSpentSeconds: 3600, startedAt: "2026-06-06T09:00:00.000+0000" });

    expect(verifySubmission(draft, [])).toBe("failed");
  });
});
