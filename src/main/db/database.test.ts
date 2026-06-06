import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, readAppInfo } from "./database.js";

describe("openDatabase", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ogar-db-"));
    dbPath = join(dir, "ogar.db");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the database file on first run and migrates it to the latest schema", () => {
    expect(existsSync(dbPath)).toBe(false);

    const db = openDatabase(dbPath);

    expect(existsSync(dbPath)).toBe(true);
    expect(db.pragma("user_version", { simple: true })).toBe(4);
    db.close();
  });

  it("reads the seeded app name and current schema version", () => {
    const db = openDatabase(dbPath);

    expect(readAppInfo(db)).toEqual({ name: "O.G.A.R.", schemaVersion: 4 });
    db.close();
  });

  it("is idempotent across restarts: reopening neither re-migrates nor reseeds", () => {
    openDatabase(dbPath).close();

    const db = openDatabase(dbPath);

    expect(db.pragma("user_version", { simple: true })).toBe(4);
    const metaRows = db.prepare("SELECT COUNT(*) AS n FROM meta").get() as { n: number };
    expect(metaRows.n).toBe(1);
    db.close();
  });
});
