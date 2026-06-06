import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppInfo, JiraTicket } from "../../shared/ipc";

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [tickets, setTickets] = useState<JiraTicket[] | null>(null);
  const [activeTicket, setActiveTicket] = useState<JiraTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [appInfo, openTickets, active] = await Promise.all([
        window.ogar.getAppInfo(),
        window.ogar.getMyOpenTickets().catch(() => null),
        window.ogar.getActiveTicket(),
      ]);
      setInfo(appInfo);
      setTickets(openTickets);
      setActiveTicket(active);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTicket = useCallback(async (ticket: JiraTicket) => {
    await window.ogar.setActiveTicket(ticket);
    setActiveTicket(ticket);
  }, []);

  const clearTicket = useCallback(async () => {
    await window.ogar.setActiveTicket(null);
    setActiveTicket(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-4xl font-bold tracking-tight">{info?.name ?? "Loading…"}</h1>
      <p className="text-muted-foreground">
        {error
          ? `Error: ${error}`
          : info
            ? `Connected to local database · schema version ${info.schemaVersion}`
            : "Reading from the local database…"}
      </p>

      {activeTicket && (
        <div className="flex w-full max-w-lg items-center justify-between rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">Active:</span>
            <span className="font-mono font-medium">{activeTicket.key}</span>
            <span className="text-muted-foreground">{activeTicket.summary}</span>
          </div>
          <button
            onClick={() => void clearTicket()}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear
          </button>
        </div>
      )}

      {tickets !== null && (
        <div className="w-full max-w-lg">
          <h2 className="mb-3 text-lg font-semibold">My open sprint tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open sprint tickets found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => {
                const isActive = activeTicket?.key === t.key;
                return (
                  <li
                    key={t.key}
                    className={`flex items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 cursor-pointer"
                    }`}
                    onClick={() => !isActive && void selectTicket(t)}
                  >
                    <span className="font-mono font-medium text-muted-foreground">{t.key}</span>
                    <span className="flex-1">{t.summary}</span>
                    {isActive && (
                      <span className="text-primary text-xs font-medium">active</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tickets === null && !error && (
        <p className="text-muted-foreground text-sm">
          Jira not configured — set jiraBaseUrl, jiraEmail, and jiraToken in settings.
        </p>
      )}

      <Button onClick={() => void load()}>Refresh</Button>
    </div>
  );
}
