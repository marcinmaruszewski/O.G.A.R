import type { ChatMessage } from "../llm/client.js";
export type { ChatMessage };

export interface TicketFields {
  key: string;
  id: string;
  summary: string;
}

export function buildCommentMessages(ticket: TicketFields, context?: string): ChatMessage[] {
  const systemPrompt =
    "You are a developer productivity assistant. Write a concise, professional Jira comment summarising what was done on this ticket. Use plain text only — no markdown, no bullet points unless natural. Be direct and factual.";

  let userContent = `Ticket: ${ticket.key}\nSummary: ${ticket.summary}`;

  if (context) {
    userContent += `\n\nContext:\n${context}`;
  }

  userContent += "\n\nWrite a Jira comment for this ticket.";

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

export function buildWorklogDescriptionMessages(
  ticket: TicketFields,
  commitSubjects: string[],
  obsidianNote?: string | null
): ChatMessage[] {
  const systemPrompt =
    "You are a developer productivity assistant. Write a concise Tempo worklog description (one to two sentences) summarising what was done on this ticket. Use plain text only — no markdown, no bullet points.";

  let userContent = `Ticket: ${ticket.key}\nSummary: ${ticket.summary}`;

  if (commitSubjects.length > 0) {
    userContent += `\n\nCommits:\n${commitSubjects.join("\n")}`;
  }

  if (obsidianNote) {
    userContent += `\n\nNotes:\n${obsidianNote}`;
  }

  userContent += "\n\nWrite a worklog description for this ticket.";

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

export function buildRegenerateCommentMessages(
  ticket: TicketFields,
  currentDraft: string,
  tweakInstruction: string
): ChatMessage[] {
  const systemPrompt =
    "You are a developer productivity assistant. Revise the provided Jira comment draft according to the given instruction. Return only the revised comment — plain text, no markdown, no bullet points unless natural.";

  const userContent =
    `Ticket: ${ticket.key}\nSummary: ${ticket.summary}\n\nCurrent draft:\n${currentDraft}\n\nRevision instruction: ${tweakInstruction}\n\nWrite the revised comment.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

export function buildAssistMessages(ticket: TicketFields, extraContext?: string): ChatMessage[] {
  const systemPrompt =
    "You are a developer productivity assistant. Given a Jira ticket, explain what needs to be done, suggest an approach, and highlight any risks or unknowns. Be concise and practical.";

  let userContent = `Ticket: ${ticket.key}\nSummary: ${ticket.summary}`;

  if (extraContext) {
    userContent += `\n\nAdditional context:\n${extraContext}`;
  }

  userContent += "\n\nWhat should I do on this ticket?";

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}
