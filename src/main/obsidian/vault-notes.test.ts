import { describe, it, expect, vi, beforeEach } from "vitest";
import { readNote, writeNote } from "./vault-notes.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import * as fs from "node:fs";
const mockExists = vi.mocked(fs.existsSync);
const mockRead = vi.mocked(fs.readFileSync);
const mockWrite = vi.mocked(fs.writeFileSync);
const mockMkdir = vi.mocked(fs.mkdirSync);

describe("readNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when vault path is not set", () => {
    const result = readNote(null, "PROJ-123");
    expect(result).toBeNull();
  });

  it("returns null when note file does not exist", () => {
    mockExists.mockReturnValue(false);
    const result = readNote("/vault", "PROJ-123");
    expect(result).toBeNull();
  });

  it("reads note from {vaultPath}/{ticketKey}.md", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("# PROJ-123\nSome notes here\n[[Other Note]]");
    const result = readNote("/vault", "PROJ-123");
    expect(result).toBe("# PROJ-123\nSome notes here\n[[Other Note]]");
    expect(mockRead).toHaveBeenCalledWith("/vault/PROJ-123.md", "utf-8");
  });

  it("preserves wikilinks in the content", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("See [[Related Ticket]] and [[Another Note|alias]]");
    const result = readNote("/vault", "PROJ-99");
    expect(result).toContain("[[Related Ticket]]");
    expect(result).toContain("[[Another Note|alias]]");
  });
});

describe("writeNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when vault path is not set", () => {
    expect(() => writeNote(null, "PROJ-123", "content")).toThrow("Obsidian vault path is not configured");
  });

  it("writes content to {vaultPath}/{ticketKey}.md", () => {
    mockExists.mockReturnValue(true);
    writeNote("/vault", "PROJ-123", "# PROJ-123\nNew content");
    expect(mockWrite).toHaveBeenCalledWith("/vault/PROJ-123.md", "# PROJ-123\nNew content", "utf-8");
  });

  it("creates vault directory if it does not exist", () => {
    mockExists.mockReturnValue(false);
    writeNote("/vault", "PROJ-123", "content");
    expect(mockMkdir).toHaveBeenCalledWith("/vault", { recursive: true });
    expect(mockWrite).toHaveBeenCalledWith("/vault/PROJ-123.md", "content", "utf-8");
  });

  it("preserves wikilinks when writing", () => {
    mockExists.mockReturnValue(true);
    const content = "Notes with [[Wikilink]] preserved";
    writeNote("/vault", "PROJ-42", content);
    expect(mockWrite).toHaveBeenCalledWith("/vault/PROJ-42.md", content, "utf-8");
  });
});
