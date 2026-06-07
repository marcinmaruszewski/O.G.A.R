import type { ChatMessage } from "../llm/client.js";

export interface TicketFields {
  key: string;
  id: string;
  summary: string;
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
