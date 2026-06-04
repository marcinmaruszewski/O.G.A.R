# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the label strings used in this repo's tracker (**beads**). Apply them
with `bd label add <label> <id>` (see `docs/agents/issue-tracker.md`).

| Canonical role    | Label in beads    | Meaning                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human` | Requires human implementation            |
| `wontfix`         | `wontfix`         | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), apply the
corresponding beads label:

```bash
bd label add ready-for-agent <id>
```

Edit the right-hand column to match whatever vocabulary you actually use. The beads
DB currently has no labels, so these are created on first use.
