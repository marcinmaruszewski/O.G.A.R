import { describe, it, expect } from "vitest";
import { buildAssistMessages, buildCommentMessages, buildRegenerateCommentMessages, buildWorklogDescriptionMessages } from "./assist.js";

const ticket = { key: "PROJ-123", id: "10001", summary: "Implement login flow" };

describe("buildAssistMessages", () => {
  it("includes ticket key and summary in user message", () => {
    const messages = buildAssistMessages(ticket);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("PROJ-123");
    expect(user?.content).toContain("Implement login flow");
  });

  it("returns a system message", () => {
    const messages = buildAssistMessages(ticket);
    expect(messages.some((m) => m.role === "system")).toBe(true);
  });

  it("includes extra context when provided", () => {
    const messages = buildAssistMessages(ticket, "Also consider the auth ADR.");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("Also consider the auth ADR.");
  });

  it("does not mention extra context section when none provided", () => {
    const messages = buildAssistMessages(ticket);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).not.toContain("Additional context:");
  });
});

describe("buildRegenerateCommentMessages", () => {
  it("includes the current draft in the user message", () => {
    const messages = buildRegenerateCommentMessages(ticket, "Original draft text.", "Make it shorter.");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("Original draft text.");
  });

  it("includes the tweak instruction in the user message", () => {
    const messages = buildRegenerateCommentMessages(ticket, "Some draft.", "More formal tone.");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("More formal tone.");
  });

  it("includes ticket key in the user message", () => {
    const messages = buildRegenerateCommentMessages(ticket, "Draft.", "Shorter.");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("PROJ-123");
  });

  it("returns a system message instructing to revise a comment", () => {
    const messages = buildRegenerateCommentMessages(ticket, "Draft.", "Shorter.");
    const system = messages.find((m) => m.role === "system");
    expect(system?.content.toLowerCase()).toContain("comment");
  });
});

describe("buildCommentMessages", () => {
  it("returns a system message and a user message", () => {
    const messages = buildCommentMessages(ticket);
    expect(messages.some((m) => m.role === "system")).toBe(true);
    expect(messages.some((m) => m.role === "user")).toBe(true);
  });

  it("includes ticket key in the user message", () => {
    const messages = buildCommentMessages(ticket);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("PROJ-123");
  });

  it("system prompt instructs writing a Jira comment", () => {
    const messages = buildCommentMessages(ticket);
    const system = messages.find((m) => m.role === "system");
    expect(system?.content.toLowerCase()).toContain("comment");
  });

  it("includes context when provided", () => {
    const messages = buildCommentMessages(ticket, "Recent commits: fix auth bug");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("Recent commits: fix auth bug");
  });

  it("does not mention context section when none provided", () => {
    const messages = buildCommentMessages(ticket);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).not.toContain("Context:");
  });
});

describe("buildWorklogDescriptionMessages", () => {
  it("returns a system message and a user message", () => {
    const messages = buildWorklogDescriptionMessages(ticket, []);
    expect(messages.some((m) => m.role === "system")).toBe(true);
    expect(messages.some((m) => m.role === "user")).toBe(true);
  });

  it("system prompt instructs writing a worklog description", () => {
    const messages = buildWorklogDescriptionMessages(ticket, []);
    const system = messages.find((m) => m.role === "system");
    expect(system?.content.toLowerCase()).toContain("worklog");
  });

  it("includes ticket key and summary in user message", () => {
    const messages = buildWorklogDescriptionMessages(ticket, []);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("PROJ-123");
    expect(user?.content).toContain("Implement login flow");
  });

  it("includes commit subjects when provided", () => {
    const messages = buildWorklogDescriptionMessages(ticket, [
      "feat(PROJ-123): add login endpoint",
      "fix(PROJ-123): handle missing token",
    ]);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("add login endpoint");
    expect(user?.content).toContain("handle missing token");
  });

  it("includes obsidian note when provided", () => {
    const messages = buildWorklogDescriptionMessages(ticket, [], "Investigated session expiry edge case.");
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).toContain("Investigated session expiry edge case.");
  });

  it("does not mention notes section when no note provided", () => {
    const messages = buildWorklogDescriptionMessages(ticket, []);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).not.toContain("Notes:");
  });

  it("does not mention commits section when no commits provided", () => {
    const messages = buildWorklogDescriptionMessages(ticket, []);
    const user = messages.find((m) => m.role === "user");
    expect(user?.content).not.toContain("Commits:");
  });
});
