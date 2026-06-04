import type Database from "better-sqlite3";

export interface Migration {
  /** Positive integer, unique within the set. Migrations apply in ascending order. */
  version: number;
  /** Human-readable label for logging and debugging. */
  name: string;
  /** Schema/data change for this version. Receives the open database. */
  up: (db: Database.Database) => void;
}

/**
 * Applies pending migrations to `db` based on `PRAGMA user_version`, and returns
 * the resulting user_version.
 */
export function runMigrations(db: Database.Database, migrations: Migration[]): number {
  const current = db.pragma("user_version", { simple: true }) as number;
  const pending = [...migrations]
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    const apply = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    apply();
  }
  return db.pragma("user_version", { simple: true }) as number;
}
