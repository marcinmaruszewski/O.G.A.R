import type { AssemblerInput } from "./assembler.js";

export interface BudgetConfig {
  totalChars: number;
  perConfluencePageChars: number;
}

const TRUNCATION_NOTICE = "\n[... truncated to fit context budget]";

function truncatePage(content: string, cap: number): string {
  if (content.length <= cap) return content;
  const cutAt = Math.max(0, cap - TRUNCATION_NOTICE.length);
  return content.slice(0, cutAt) + TRUNCATION_NOTICE;
}

export function applyBudget(input: AssemblerInput, config: BudgetConfig): AssemblerInput {
  const { totalChars, perConfluencePageChars } = config;

  // Per-page cap on Confluence content
  const cappedPages = input.confluencePages.map((p) => ({
    title: p.title,
    content: truncatePage(p.content, perConfluencePageChars),
  }));

  // Calculate chars consumed by high-priority sources (ticket, obsidian, git)
  const ticketChars = input.ticket.key.length + input.ticket.summary.length;
  const obsidianChars = input.obsidianNote ? input.obsidianNote.length : 0;
  const gitChars =
    input.gitActivity.workingTreeDiff.length +
    input.gitActivity.commits.reduce((sum, c) => sum + c.subject.length + c.diff.length, 0);

  let remaining = totalChars - ticketChars - obsidianChars - gitChars;

  // Include Confluence pages greedily until budget exhausted
  const fittingPages: Array<{ title: string; content: string }> = [];
  for (const page of cappedPages) {
    const pageChars = page.title.length + page.content.length;
    if (remaining <= 0) break;
    if (pageChars <= remaining) {
      fittingPages.push(page);
      remaining -= pageChars;
    }
    // Page doesn't fit — drop it entirely (already capped, so it's still too large)
  }

  return {
    ...input,
    confluencePages: fittingPages,
  };
}
