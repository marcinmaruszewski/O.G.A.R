import { execSync } from "node:child_process";

export interface GitCommit {
  hash: string;
  subject: string;
  diff: string;
}

export interface TicketActivity {
  commits: GitCommit[];
  workingTreeDiff: string;
}

export function readTicketActivity(repoPath: string, ticketKey: string): TicketActivity {
  const opts = { cwd: repoPath };

  const logRaw = execSync(
    `git log --grep=${ticketKey} --format="%H\x1f%s"`,
    opts
  ).toString();

  const commits: GitCommit[] = [];
  for (const line of logRaw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf("\x1f");
    if (sep === -1) continue;
    const hash = trimmed.slice(0, sep);
    const subject = trimmed.slice(sep + 1);
    const diff = execSync(`git show ${hash} --format="" --patch`, opts).toString();
    commits.push({ hash, subject, diff });
  }

  const workingTreeDiff = execSync("git diff", opts).toString();

  return { commits, workingTreeDiff };
}
