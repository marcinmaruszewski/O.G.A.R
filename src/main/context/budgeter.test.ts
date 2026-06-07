import { describe, it, expect } from "vitest";
import { applyBudget, BudgetConfig } from "./budgeter.js";
import type { AssemblerInput } from "./assembler.js";

const ticket = { key: "PROJ-1", summary: "Test ticket" };
const noConfluence: Array<{ title: string; content: string }> = [];
const noGit = { commits: [], workingTreeDiff: "" };

function makeInput(overrides: Partial<AssemblerInput> = {}): AssemblerInput {
  return {
    ticket,
    confluencePages: noConfluence,
    obsidianNote: null,
    gitActivity: noGit,
    ...overrides,
  };
}

const generousBudget: BudgetConfig = {
  totalChars: 100_000,
  perConfluencePageChars: 10_000,
};

describe("applyBudget", () => {
  it("returns input unchanged when total content fits within budget", () => {
    const input = makeInput({ confluencePages: [{ title: "ADR", content: "short content" }] });
    const result = applyBudget(input, generousBudget);
    expect(result.confluencePages[0].content).toBe("short content");
  });

  it("truncates a Confluence page that exceeds perConfluencePageChars", () => {
    const longContent = "x".repeat(200);
    const input = makeInput({ confluencePages: [{ title: "Big page", content: longContent }] });
    const budget: BudgetConfig = { totalChars: 100_000, perConfluencePageChars: 100 };
    const result = applyBudget(input, budget);
    expect(result.confluencePages[0].content.length).toBeLessThan(longContent.length);
  });

  it("appends a truncation notice to a truncated Confluence page", () => {
    const longContent = "x".repeat(200);
    const input = makeInput({ confluencePages: [{ title: "Big page", content: longContent }] });
    const budget: BudgetConfig = { totalChars: 100_000, perConfluencePageChars: 100 };
    const result = applyBudget(input, budget);
    expect(result.confluencePages[0].content).toContain("[... truncated");
  });

  it("drops Confluence pages that do not fit within totalChars after high-priority sources", () => {
    const obsidianNote = "a".repeat(500);
    const pageContent = "b".repeat(500);
    const input = makeInput({
      obsidianNote,
      confluencePages: [
        { title: "Page1", content: pageContent },
        { title: "Page2", content: pageContent },
      ],
    });
    // Ticket + obsidian takes ~550 chars; budget is 700, leaves ~150 for confluence
    const budget: BudgetConfig = { totalChars: 700, perConfluencePageChars: 10_000 };
    const result = applyBudget(input, budget);
    expect(result.confluencePages.length).toBeLessThan(2);
  });

  it("preserves obsidian note even when Confluence would overflow the budget", () => {
    const obsidianNote = "important notes";
    const pageContent = "x".repeat(1_000);
    const input = makeInput({
      obsidianNote,
      confluencePages: [{ title: "Huge page", content: pageContent }],
    });
    const budget: BudgetConfig = { totalChars: 200, perConfluencePageChars: 10_000 };
    const result = applyBudget(input, budget);
    expect(result.obsidianNote).toBe("important notes");
  });

  it("preserves git working tree diff even when Confluence would overflow the budget", () => {
    const workingTreeDiff = "diff --git a/src/foo.ts b/src/foo.ts\n+new line";
    const pageContent = "x".repeat(1_000);
    const input = makeInput({
      gitActivity: { commits: [], workingTreeDiff },
      confluencePages: [{ title: "Huge page", content: pageContent }],
    });
    const budget: BudgetConfig = { totalChars: 200, perConfluencePageChars: 10_000 };
    const result = applyBudget(input, budget);
    expect(result.gitActivity.workingTreeDiff).toBe(workingTreeDiff);
  });
});
