/**
 * IPC contract shared by the main process, preload bridge, and renderer.
 * This is the single source of truth for channel names and payload shapes.
 */

/** Identity facts read out of the database, surfaced to the renderer. */
export interface AppInfo {
  name: string;
  schemaVersion: number;
}

export interface JiraTicket {
  key: string;
  id: string;
  summary: string;
}

/** Channel names. Keep stable; the preload and main process both reference these. */
export const IPC = {
  getAppInfo: "app:getInfo",
  getSetting: "settings:get",
  setSetting: "settings:set",
  getSecret: "secrets:get",
  setSecret: "secrets:set",
  getMyOpenTickets: "jira:getMyOpenTickets",
} as const;

/** The typed surface exposed to the renderer via contextBridge as `window.ogar`. */
export interface OgarApi {
  getAppInfo(): Promise<AppInfo>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  getMyOpenTickets(): Promise<JiraTicket[]>;
}
