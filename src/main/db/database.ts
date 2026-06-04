import Database from "better-sqlite3";
import type { AppInfo } from "../../shared/ipc.js";
import { runMigrations } from "./migrations.js";
import { migrations } from "./schema.js";

export type { AppInfo };

/**
 * Opens (creating if needed) the SQLite database at `path` and migrates it to
 * the latest schema. The returned connection is ready to use.
 */
export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db, migrations);
  return db;
}

/** Reads the seeded application identity and current schema version. */
export function readAppInfo(db: Database.Database): AppInfo {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'app_name'").get() as
    | { value: string }
    | undefined;
  if (!row) throw new Error("meta.app_name is missing; database is not initialized");
  return {
    name: row.value,
    schemaVersion: db.pragma("user_version", { simple: true }) as number,
  };
}
