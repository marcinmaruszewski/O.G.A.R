import { useCallback, useEffect, useState } from "react";
import type { TicketActivity } from "../../../shared/ipc";

interface Props {
  ticketKey: string;
}

export function GitActivity({ ticketKey }: Props): JSX.Element {
  const [activity, setActivity] = useState<TicketActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.ogar.getTicketActivity(ticketKey);
      setActivity(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [ticketKey]);

  useEffect(() => {
    if (expanded) void load();
  }, [expanded, load]);

  const hasChanges =
    activity && (activity.commits.length > 0 || activity.workingTreeDiff.length > 0);

  return (
    <div className="w-full max-w-lg rounded-md border border-border text-sm">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-left font-medium hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Git Activity</span>
        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {loading && <p className="text-muted-foreground text-xs">Loading…</p>}
          {error && <p className="text-destructive text-xs">{error}</p>}

          {activity && !loading && (
            <>
              {activity.commits.length === 0 && !activity.workingTreeDiff && (
                <p className="text-muted-foreground text-xs">No commits or uncommitted changes found for {ticketKey}.</p>
              )}

              {activity.commits.length > 0 && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">
                    Commits ({activity.commits.length})
                  </p>
                  <ul className="space-y-2">
                    {activity.commits.map((c) => (
                      <li key={c.hash} className="rounded border border-border bg-muted/30 p-2">
                        <p className="font-mono text-xs text-muted-foreground">{c.hash.slice(0, 8)}</p>
                        <p className="text-xs mt-0.5">{c.subject}</p>
                        {c.diff && (
                          <pre className="mt-1 overflow-x-auto whitespace-pre text-xs font-mono text-muted-foreground max-h-40 overflow-y-auto">
                            {c.diff}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activity.workingTreeDiff && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Uncommitted changes</p>
                  <pre className="overflow-x-auto whitespace-pre text-xs font-mono text-muted-foreground bg-muted/30 rounded border border-border p-2 max-h-48 overflow-y-auto">
                    {activity.workingTreeDiff}
                  </pre>
                </div>
              )}

              {hasChanges && (
                <button
                  onClick={() => void load()}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Refresh
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
