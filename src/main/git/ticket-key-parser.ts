const SCOPE_RE = /^\S+\(([^)]+)\)[!]?:/;
const TICKET_KEY_RE = /[A-Z]+-\d+/;

export function parseTicketKey(commitMessage: string): string | null {
  const scopeMatch = SCOPE_RE.exec(commitMessage);
  if (!scopeMatch) return null;
  const scope = scopeMatch[1];
  const keyMatch = TICKET_KEY_RE.exec(scope);
  return keyMatch ? keyMatch[0] : null;
}
