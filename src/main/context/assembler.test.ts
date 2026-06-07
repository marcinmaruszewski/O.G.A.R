import { describe, it, expect } from "vitest";
import { assembleContext } from "./assembler.js";

const ticket = { key: "PROJ-42", summary: "Implement login flow" };
const noConfluence: Array<{ title: string; content: string }> = [];
const noGit = { commits: [], workingTreeDiff: "" };

describe("assembleContext", () => {
  it("includes the ticket key in the output", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity: noGit });
    expect(out).toContain("PROJ-42");
  });

  it("includes the ticket summary in the output", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity: noGit });
    expect(out).toContain("Implement login flow");
  });

  it("includes Confluence page title when pages are provided", () => {
    const pages = [{ title: "Login ADR", content: "We chose OAuth2." }];
    const out = assembleContext({ ticket, confluencePages: pages, obsidianNote: null, gitActivity: noGit });
    expect(out).toContain("Login ADR");
  });

  it("includes Confluence page content when pages are provided", () => {
    const pages = [{ title: "Login ADR", content: "We chose OAuth2." }];
    const out = assembleContext({ ticket, confluencePages: pages, obsidianNote: null, gitActivity: noGit });
    expect(out).toContain("We chose OAuth2.");
  });

  it("includes Obsidian note content when provided", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: "My notes about the ticket.", gitActivity: noGit });
    expect(out).toContain("My notes about the ticket.");
  });

  it("omits Obsidian section when note is null", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity: noGit });
    expect(out).not.toContain("Obsidian");
  });

  it("includes git commit subjects when commits are present", () => {
    const gitActivity = { commits: [{ subject: "fix: auth token refresh", diff: "diff --git ..." }], workingTreeDiff: "" };
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity });
    expect(out).toContain("fix: auth token refresh");
  });

  it("includes working tree diff when present", () => {
    const gitActivity = { commits: [], workingTreeDiff: "diff --git a/src/auth.ts b/src/auth.ts" };
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity });
    expect(out).toContain("diff --git a/src/auth.ts b/src/auth.ts");
  });

  it("omits Git section when no commits and no working tree diff", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity: noGit });
    expect(out).not.toContain("Git");
  });

  it("returns non-empty string even when all optional parts are absent", () => {
    const out = assembleContext({ ticket, confluencePages: noConfluence, obsidianNote: null, gitActivity: noGit });
    expect(out.trim().length).toBeGreaterThan(0);
  });
});
