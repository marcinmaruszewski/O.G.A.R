import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { JiraTicket } from "../../../shared/ipc";

interface Props {
  activeTicket: JiraTicket;
}

export function TicketAssist({ activeTicket }: Props): JSX.Element {
  const [extraContext, setExtraContext] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await window.ogar.assistAsk(extraContext || undefined);
      setResponse(result.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-md border border-border p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-sm">
        Ask LLM — {activeTicket.key}: {activeTicket.summary}
      </h3>

      <textarea
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        rows={3}
        placeholder="Extra context (optional) — paste ADR, design notes, etc."
        value={extraContext}
        onChange={(e) => setExtraContext(e.target.value)}
        disabled={loading}
      />

      <Button onClick={() => void ask()} disabled={loading} className="self-start">
        {loading ? "Asking…" : "What should I do?"}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {response && (
        <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  );
}
