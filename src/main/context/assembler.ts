export interface AssemblerInput {
  ticket: { key: string; summary: string };
  confluencePages: Array<{ title: string; content: string }>;
  obsidianNote: string | null;
  gitActivity: { commits: Array<{ subject: string; diff: string }>; workingTreeDiff: string };
}

export function assembleContext(input: AssemblerInput): string {
  const { ticket, confluencePages, obsidianNote, gitActivity } = input;
  const parts: string[] = [];

  parts.push(`## Ticket: ${ticket.key}\n${ticket.summary}`);

  if (confluencePages.length > 0) {
    const pages = confluencePages
      .map((p) => `### ${p.title}\n${p.content}`)
      .join("\n\n");
    parts.push(`## Confluence\n${pages}`);
  }

  if (obsidianNote) {
    parts.push(`## Obsidian Notes\n${obsidianNote}`);
  }

  const hasGit = gitActivity.commits.length > 0 || gitActivity.workingTreeDiff.trim().length > 0;
  if (hasGit) {
    const commitLines = gitActivity.commits
      .map((c) => `- ${c.subject}\n${c.diff}`)
      .join("\n\n");
    const diffSection = gitActivity.workingTreeDiff.trim()
      ? `\n### Working tree changes\n${gitActivity.workingTreeDiff}`
      : "";
    parts.push(`## Git Activity\n${commitLines}${diffSection}`);
  }

  return parts.join("\n\n");
}
