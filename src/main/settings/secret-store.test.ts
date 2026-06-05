import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SecretStore, type SafeStorageAdapter } from "./secret-store.js";

const stubAdapter = (available = true): SafeStorageAdapter => ({
  isEncryptionAvailable: () => available,
  encryptString: (plaintext) => Buffer.from(`enc:${plaintext}`),
  decryptString: (buf) => buf.toString().replace(/^enc:/, ""),
});

describe("SecretStore", () => {
  let db: Database.Database;
  let store: SecretStore;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("CREATE TABLE secrets (key TEXT PRIMARY KEY, encrypted_value BLOB NOT NULL)");
    store = new SecretStore(db, stubAdapter());
  });

  afterEach(() => db.close());

  it("returns null for a key that has never been set", () => {
    expect(store.get("jiraToken")).toBeNull();
  });

  it("stores a secret and retrieves it decrypted", () => {
    store.set("jiraToken", "secret-abc");
    expect(store.get("jiraToken")).toBe("secret-abc");
  });

  it("rotate replaces the existing secret", () => {
    store.set("jiraToken", "old");
    store.set("jiraToken", "secret-abc");
    expect(store.get("jiraToken")).toBe("secret-abc");
  });

  it("setting one key does not affect another", () => {
    store.set("jiraToken", "a");
    expect(store.get("tempoToken")).toBeNull();
  });

  it("throws when encryption is unavailable on set", () => {
    const unavailableStore = new SecretStore(db, stubAdapter(false));
    expect(() => unavailableStore.set("jiraToken", "x")).toThrow(/encryption/i);
  });

  it("throws when encryption is unavailable on get", () => {
    // secret was stored when encryption was available
    store.set("jiraToken", "secret-abc");
    const unavailableStore = new SecretStore(db, stubAdapter(false));
    expect(() => unavailableStore.get("jiraToken")).toThrow(/encryption/i);
  });
});
