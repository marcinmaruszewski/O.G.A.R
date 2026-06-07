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

  const [commentDraft, setCommentDraft] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentPosted, setCommentPosted] = useState(false);
  const [tweakInstruction, setTweakInstruction] = useState("");

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

  const draftComment = async () => {
    setCommentLoading(true);
    setCommentError(null);
    setCommentDraft(null);
    setCommentPosted(false);
    setTweakInstruction("");
    try {
      const result = await window.ogar.assistDraftComment();
      setCommentDraft(result.content);
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommentLoading(false);
    }
  };

  const regenerateComment = async () => {
    if (!commentDraft) return;
    setCommentLoading(true);
    setCommentError(null);
    try {
      const result = await window.ogar.assistRegenerateComment(commentDraft, tweakInstruction);
      setCommentDraft(result.content);
      setTweakInstruction("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommentLoading(false);
    }
  };

  const postComment = async () => {
    if (!commentDraft) return;
    setCommentPosting(true);
    setCommentError(null);
    try {
      await window.ogar.jiraPostComment(activeTicket.key, commentDraft);
      setCommentPosted(true);
      setCommentDraft(null);
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommentPosting(false);
    }
  };

  return (
    <div className="w-full max-w-lg flex flex-col gap-4">
      <div className="rounded-md border border-border p-4 flex flex-col gap-3">
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

      <div className="rounded-md border border-border p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Draft Jira Comment</h3>

        <Button onClick={() => void draftComment()} disabled={commentLoading || commentPosting} variant="outline" className="self-start">
          {commentLoading ? "Drafting…" : "Draft comment"}
        </Button>

        {commentError && <p className="text-destructive text-sm">{commentError}</p>}

        {commentPosted && <p className="text-sm text-green-600">Comment posted to {activeTicket.key}.</p>}

        {commentDraft !== null && (
          <>
            <textarea
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={6}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              disabled={commentPosting || commentLoading}
            />
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Tweak instruction (e.g. shorter, more formal)"
                value={tweakInstruction}
                onChange={(e) => setTweakInstruction(e.target.value)}
                disabled={commentPosting || commentLoading}
                onKeyDown={(e) => { if (e.key === "Enter" && tweakInstruction.trim()) void regenerateComment(); }}
              />
              <Button
                onClick={() => void regenerateComment()}
                disabled={commentPosting || commentLoading || !tweakInstruction.trim()}
                variant="outline"
                className="self-start"
              >
                {commentLoading ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void postComment()} disabled={commentPosting || commentLoading || !commentDraft.trim()} className="self-start">
                {commentPosting ? "Posting…" : "Approve & post"}
              </Button>
              <Button onClick={() => setCommentDraft(null)} disabled={commentPosting || commentLoading} variant="outline" className="self-start">
                Discard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
