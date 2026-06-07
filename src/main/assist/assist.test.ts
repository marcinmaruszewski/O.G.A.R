import { describe, it, expect } from "vitest";
import { buildAssistMessages, buildCommentMessages } from "./assist.js";

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
