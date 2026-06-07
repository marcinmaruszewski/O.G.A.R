import { describe, it, expect } from "vitest";
import { buildAssistMessages } from "./assist.js";

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
