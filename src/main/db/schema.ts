import type { Migration } from "./migrations.js";

/**
 * Ordered schema migrations for the O.G.A.R. database. Append new migrations
 * with the next version number; never edit or reorder existing ones.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: "init meta",
    up: (db) => {
      db.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("app_name", "O.G.A.R.");
    },
  },
  {
    version: 2,
    name: "settings",
    up: (db) => {
      db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    },
  },
  {
    version: 3,
    name: "secrets",
    up: (db) => {
      db.exec("CREATE TABLE secrets (key TEXT PRIMARY KEY, encrypted_value BLOB NOT NULL)");
    },
  },
];
