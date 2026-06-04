import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations, type Migration } from "./migrations.js";

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  const userVersion = (d: Database.Database): number =>
    (d.pragma("user_version", { simple: true }) as number);

  it("applies a migration to a fresh database and records its version", () => {
    const migrations: Migration[] = [
      {
        version: 1,
        name: "create settings",
        up: (d) => d.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)"),
      },
    ];

    const result = runMigrations(db, migrations);

    expect(result).toBe(1);
    expect(userVersion(db)).toBe(1);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'settings'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("does not re-apply a migration that has already run", () => {
    let calls = 0;
    const migrations: Migration[] = [{ version: 1, name: "noop", up: () => { calls += 1; } }];

    runMigrations(db, migrations);
    const result = runMigrations(db, migrations);

    expect(calls).toBe(1);
    expect(result).toBe(1);
  });

  it("applies pending migrations in ascending version order regardless of input order", () => {
    const applied: number[] = [];
    const migrations: Migration[] = [
      { version: 2, name: "second", up: () => { applied.push(2); } },
      { version: 1, name: "first", up: () => { applied.push(1); } },
    ];

    const result = runMigrations(db, migrations);

    expect(applied).toEqual([1, 2]);
    expect(result).toBe(2);
  });

  it("rolls back a failing migration and keeps the last good version", () => {
    const migrations: Migration[] = [
      { version: 1, name: "create a", up: (d) => d.exec("CREATE TABLE a (id INTEGER)") },
      {
        version: 2,
        name: "create b then fail",
        up: (d) => {
          d.exec("CREATE TABLE b (id INTEGER)");
          throw new Error("boom");
        },
      },
    ];

    expect(() => runMigrations(db, migrations)).toThrow("boom");

    expect(userVersion(db)).toBe(1);
    const hasTable = (name: string) =>
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .all(name).length;
    expect(hasTable("a")).toBe(1);
    expect(hasTable("b")).toBe(0);
  });
});
