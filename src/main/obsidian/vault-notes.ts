import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function readNote(vaultPath: string | null, ticketKey: string): string | null {
  if (!vaultPath) return null;
  const filePath = join(vaultPath, `${ticketKey}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function writeNote(vaultPath: string | null, ticketKey: string, content: string): void {
  if (!vaultPath) throw new Error("Obsidian vault path is not configured");
  if (!existsSync(vaultPath)) mkdirSync(vaultPath, { recursive: true });
  writeFileSync(join(vaultPath, `${ticketKey}.md`), content, "utf-8");
}
