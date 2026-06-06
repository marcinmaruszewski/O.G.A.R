import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppInfo, JiraTicket, JiraTransition } from "../../shared/ipc";

export default function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [tickets, setTickets] = useState<JiraTicket[] | null>(null);
  const [activeTicket, setActiveTicket] = useState<JiraTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<JiraTransition[] | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [applyingTransition, setApplyingTransition] = useState(false);

  const loadTransitions = useCallback(async (ticketKey: string) => {
    setTransitions(null);
    setTransitionError(null);
    try {
      const result = await window.ogar.getTransitions(ticketKey);
      setTransitions(result);
    } catch (e) {
      setTransitionError(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
      if (active) void loadTransitions(active.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [loadTransitions]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTicket = useCallback(async (ticket: JiraTicket) => {
    await window.ogar.setActiveTicket(ticket);
    setActiveTicket(ticket);
    void loadTransitions(ticket.key);
  }, [loadTransitions]);

  const clearTicket = useCallback(async () => {
    await window.ogar.setActiveTicket(null);
    setActiveTicket(null);
    setTransitions(null);
    setTransitionError(null);
  }, []);

  const applyTransition = useCallback(async (issueKey: string, transitionId: string) => {
    setApplyingTransition(true);
    setTransitionError(null);
    try {
      await window.ogar.applyTransition(issueKey, transitionId);
      void loadTransitions(issueKey);
    } catch (e) {
      setTransitionError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingTransition(false);
    }
  }, [loadTransitions]);

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
        <div className="w-full max-w-lg rounded-md border border-primary bg-primary/10 text-sm">
          <div className="flex items-center justify-between px-4 py-2">
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
          <div className="border-t border-primary/20 px-4 py-2">
            {transitionError && (
              <p className="text-destructive text-xs mb-1">{transitionError}</p>
            )}
            {transitions === null && !transitionError && (
              <p className="text-muted-foreground text-xs">Loading transitions…</p>
            )}
            {transitions !== null && transitions.length === 0 && (
              <p className="text-muted-foreground text-xs">No transitions available.</p>
            )}
            {transitions !== null && transitions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-muted-foreground text-xs self-center">Move to:</span>
                {transitions.map((t) => (
                  <button
                    key={t.id}
                    disabled={applyingTransition}
                    onClick={() => void applyTransition(activeTicket.key, t.id)}
                    className="rounded border border-primary/40 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
