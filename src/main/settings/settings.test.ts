import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSetting, setSetting } from "./settings.js";

describe("settings table", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE secrets (key TEXT PRIMARY KEY, encrypted_value BLOB NOT NULL);
    `);
  });

  afterEach(() => db.close());

  it("returns null for a key that has never been set", () => {
    expect(getSetting(db, "jiraBaseUrl")).toBeNull();
  });

  it("stores a value and retrieves it", () => {
    setSetting(db, "jiraBaseUrl", "https://dentsu-emea.atlassian.net/rest/api/3");
    expect(getSetting(db, "jiraBaseUrl")).toBe("https://dentsu-emea.atlassian.net/rest/api/3");
  });

  it("upserts: overwriting a key updates the stored value", () => {
    setSetting(db, "jiraBaseUrl", "old");
    setSetting(db, "jiraBaseUrl", "https://dentsu-emea.atlassian.net/rest/api/3");
    expect(getSetting(db, "jiraBaseUrl")).toBe("https://dentsu-emea.atlassian.net/rest/api/3");
  });

  it("setting one key does not affect another", () => {
    setSetting(db, "tempoHost", "https://api.tempo.io/4");
    expect(getSetting(db, "jiraBaseUrl")).toBeNull();
  });
});
