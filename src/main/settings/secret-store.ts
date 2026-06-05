import type Database from "better-sqlite3";

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export class SecretStore {
  constructor(
    private readonly db: Database.Database,
    private readonly crypto: SafeStorageAdapter
  ) {}

  get(key: string): string | null {
    if (!this.crypto.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this system");
    }
    const row = this.db
      .prepare("SELECT encrypted_value FROM secrets WHERE key = ?")
      .get(key) as { encrypted_value: Buffer } | undefined;
    if (!row) return null;
    return this.crypto.decryptString(row.encrypted_value);
  }

  set(key: string, value: string): void {
    if (!this.crypto.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this system");
    }
    const encrypted = this.crypto.encryptString(value);
    this.db
      .prepare(
        "INSERT INTO secrets (key, encrypted_value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET encrypted_value = excluded.encrypted_value"
      )
      .run(key, encrypted);
  }
}
