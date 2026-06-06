import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ObsidianNoteProps {
  ticketKey: string;
}

export function ObsidianNote({ ticketKey }: ObsidianNoteProps): JSX.Element {
  const [content, setContent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const note = await window.ogar.getObsidianNote(ticketKey);
      setContent(note);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ticketKey]);

  useEffect(() => {
    void load();
    setEditing(false);
  }, [load]);

  const startEditing = () => {
    setDraft(content ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft("");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await window.ogar.setObsidianNote(ticketKey, draft);
      setContent(draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold">Obsidian Note</span>
        {!editing && (
          <button
            onClick={startEditing}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={`Notes for ${ticketKey}…`}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : content !== null ? (
          <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">{content}</pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            No note yet.{" "}
            <button onClick={startEditing} className="underline hover:text-foreground">
              Create one
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
