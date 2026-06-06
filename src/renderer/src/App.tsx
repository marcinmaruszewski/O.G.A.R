import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppInfo, JiraTicket } from "../../shared/ipc";

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [tickets, setTickets] = useState<JiraTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [appInfo, openTickets] = await Promise.all([
        window.ogar.getAppInfo(),
        window.ogar.getMyOpenTickets().catch(() => null),
      ]);
      setInfo(appInfo);
      setTickets(openTickets);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

      {tickets !== null && (
        <div className="w-full max-w-lg">
          <h2 className="mb-3 text-lg font-semibold">My open sprint tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open sprint tickets found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map((t) => (
                <li
                  key={t.key}
                  className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <span className="font-mono font-medium text-muted-foreground">{t.key}</span>
                  <span>{t.summary}</span>
                </li>
              ))}
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
