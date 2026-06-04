# Issue Tracker

Issues for this repo live in **beads (bd)** — not GitHub Issues, not local
markdown under `.scratch/`. Run `bd prime` for the full workflow.

> Architecture: issues live in a local Dolt database (`.beads/dolt/`); cross-machine
> sync uses `bd dolt push/pull`, stored under `refs/dolt/data` on the git remote —
> separate from your code in `refs/heads/*`. `.beads/issues.jsonl` is a passive
> export, not the source of truth.

## How skills should read and write issues

When a skill says "create an issue", "file a ticket", "read the tracker", or
"apply a label", translate that to the `bd` commands below — never `gh issue ...`,
never a markdown file.

### Create

```bash
bd create --title="..." --description="..." --type=task|bug|feature|epic --priority=2
```

- Priority is 0–4 (0 = critical, 2 = medium, 4 = backlog) — not high/medium/low.
- `--labels=a,b` tags at creation; `--design`, `--notes`, `--acceptance` set structured fields.
- `bd create --validate` checks the description has the required sections.

### Find & read

```bash
bd ready                 # issues with no open blockers — grab next
bd list --status=open    # everything open
bd show <id>             # full detail incl. dependencies
bd search <query>        # keyword search
```

### Update & claim

```bash
bd update <id> --claim                       # atomically take the issue
bd update <id> --status=in_progress
bd update <id> --title/--description/--notes/--design "..."
```

Do NOT use `bd edit` — it opens $EDITOR and blocks the agent.

### Close

```bash
bd close <id> [<id> ...]                      # close one or many
bd close <id> --reason="..."
```

### Dependencies

```bash
bd dep add <issue> <depends-on>               # issue depends on depends-on
bd blocked                                    # what's blocked
```

## Triage labels

Apply triage roles as beads labels — see `docs/agents/triage-labels.md` for the
role→label mapping:

```bash
bd label add <label> <id> [<id> ...]
bd label remove <label> <id>
bd label list <id>
```

## Sync

beads auto-commits to Dolt. At session close, push both code and beads data
(`bd dolt push` then `git push`, or rely on the configured `.beads/hooks`).
See `bd prime` for the session-close protocol.
