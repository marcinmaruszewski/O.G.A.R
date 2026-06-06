import { describe, it, expect } from "vitest";
import { parseTicketKey } from "./ticket-key-parser.js";

describe("parseTicketKey", () => {
  it("extracts key from standard conventional commit scope", () => {
    expect(parseTicketKey("feat(ABC-123): add something")).toBe("ABC-123");
  });

  it("extracts key from fix commit", () => {
    expect(parseTicketKey("fix(PROJ-456): fix bug")).toBe("PROJ-456");
  });

  it("is liberal about the type word", () => {
    expect(parseTicketKey("refactor(MYTEAM-789): cleanup")).toBe("MYTEAM-789");
    expect(parseTicketKey("ANYTHING(XY-1): works")).toBe("XY-1");
  });

  it("handles breaking change marker", () => {
    expect(parseTicketKey("feat(ABC-123)!: breaking change")).toBe("ABC-123");
  });

  it("returns null when no scope present", () => {
    expect(parseTicketKey("feat: add something")).toBeNull();
  });

  it("returns null when scope has no ticket-like pattern", () => {
    expect(parseTicketKey("feat(no-ticket): add something")).toBeNull();
    expect(parseTicketKey("chore(cleanup): rename things")).toBeNull();
  });

  it("returns null for completely malformed message", () => {
    expect(parseTicketKey("some random commit message")).toBeNull();
    expect(parseTicketKey("")).toBeNull();
  });

  it("returns null when scope looks like ticket but lowercase", () => {
    expect(parseTicketKey("feat(abc-123): lowercase project")).toBeNull();
  });

  it("extracts first match when multiple ticket-like patterns exist", () => {
    expect(parseTicketKey("feat(ABC-123): also mentions PROJ-456")).toBe("ABC-123");
  });
});
