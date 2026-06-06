import { describe, it, expect, vi, beforeEach } from "vitest";
import { readTicketActivity } from "./activity-reader.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
const mockExec = vi.mocked(execSync);

function execResult(stdout: string): Buffer {
  return Buffer.from(stdout);
}

describe("readTicketActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty commits and empty working-tree diff when no commits match", () => {
    mockExec
      .mockReturnValueOnce(execResult("")) // git log
      .mockReturnValueOnce(execResult("")); // working-tree diff
    const result = readTicketActivity("/repo", "ABC-123");
    expect(result.commits).toEqual([]);
    expect(result.workingTreeDiff).toBe("");
  });

  it("returns commits with hash and subject for matching ticket", () => {
    const logOutput = "abc1234\x1fFirst commit\nabc5678\x1fSecond commit\n";
    mockExec
      .mockReturnValueOnce(execResult(logOutput))
      .mockReturnValueOnce(execResult("diff --git a/foo.ts b/foo.ts\n+added"))
      .mockReturnValueOnce(execResult("diff --git a/bar.ts b/bar.ts\n+more"))
      .mockReturnValueOnce(execResult("")); // working-tree diff

    const result = readTicketActivity("/repo", "ABC-123");

    expect(result.commits).toHaveLength(2);
    expect(result.commits[0]).toEqual({
      hash: "abc1234",
      subject: "First commit",
      diff: "diff --git a/foo.ts b/foo.ts\n+added",
    });
    expect(result.commits[1]).toEqual({
      hash: "abc5678",
      subject: "Second commit",
      diff: "diff --git a/bar.ts b/bar.ts\n+more",
    });
  });

  it("includes working-tree diff", () => {
    mockExec
      .mockReturnValueOnce(execResult("")) // no commits
      .mockReturnValueOnce(execResult("diff --git a/new.ts b/new.ts\n+new file")); // working-tree
    const result = readTicketActivity("/repo", "ABC-123");
    expect(result.workingTreeDiff).toBe("diff --git a/new.ts b/new.ts\n+new file");
  });

  it("calls git log with correct grep pattern and repo path", () => {
    mockExec
      .mockReturnValueOnce(execResult(""))
      .mockReturnValueOnce(execResult(""));

    readTicketActivity("/my/repo", "PROJ-99");

    const logCall = mockExec.mock.calls[0];
    expect(logCall[0]).toContain("--grep=PROJ-99");
    expect(logCall[1]).toMatchObject({ cwd: "/my/repo" });
  });

  it("calls git diff for working-tree changes", () => {
    mockExec
      .mockReturnValueOnce(execResult(""))
      .mockReturnValueOnce(execResult(""));

    readTicketActivity("/my/repo", "PROJ-99");

    const diffCall = mockExec.mock.calls[1];
    expect(diffCall[0]).toContain("git diff");
    expect(diffCall[1]).toMatchObject({ cwd: "/my/repo" });
  });
});
