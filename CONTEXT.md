# O.G.A.R.

O.G.A.R. helps one developer organize day-to-day work around Jira tickets, local knowledge, and local assistant support while keeping the developer in control of every external write.

## Language

**Workspace**:
An internal O.G.A.R. grouping for a coherent area of work. A Workspace can include tickets from multiple Jira projects and must not be treated as equivalent to a Jira project.
_Avoid_: Jira project, project

**Workspace Color**:
A developer-chosen color used to visually identify a Workspace across dashboards, sessions, and worklog views.
_Avoid_: workspace icon, Jira project color

**Home Dashboard**:
The global start screen of the app. It is not scoped to one Workspace and helps the developer orient across workspaces, daily reporting status, and any active Pomodoro Session without listing every ticket.
_Avoid_: selected workspace dashboard, ticket detail

**Workspace Dashboard**:
The dashboard for one Workspace, showing that Workspace's Work Queue, Available Tickets, and Workspace-level context.
_Avoid_: home dashboard, Jira board

**Workspace Settings**:
The Workspace-scoped configuration screen for editing the Workspace's name, Workspace JQL, and knowledge sources.
_Avoid_: global settings, integration settings

**Workspace Snapshot**:
The last locally remembered result of refreshing a Workspace's JQL, including when it was refreshed. It lets the Workspace Dashboard remain useful when Jira is temporarily unavailable.
_Avoid_: source of truth, pinned tickets

**Selected Workspace**:
The Workspace currently opened in a Workspace-scoped view. The Home Dashboard does not have a Selected Workspace.
_Avoid_: current project, global workspace

**Usable Setup**:
A configuration that is sufficient for the developer to use the dashboard and Ticket Detail. It requires Jira access and at least one Workspace; local assistant, Tempo, Obsidian, and Confluence features are optional additions.
_Avoid_: complete setup, full setup

**Workspace JQL**:
The single Jira query used to discover Jira tickets that may be relevant to a Workspace. It does not decide which tickets are part of the Workspace.
_Avoid_: global ticket filter, project filter

**Jira Project Key**:
The Jira project prefix in a ticket key, such as "ABC" in "ABC-123". A Jira Project Key can be used as a Workspace JQL hint but must not be treated as the same thing as a Workspace.
_Avoid_: workspace, project

**Workspace Knowledge Source**:
A source of reference material attached to a Workspace because it applies broadly to the Workspace's area of work. A Workspace can be useful without any Workspace Knowledge Sources.
_Avoid_: project documentation, global context

**Ticket Knowledge Source**:
A source of reference material attached to a specific Pinned Ticket within one Workspace because it applies to that ticket in that Workspace's context.
_Avoid_: workspace documentation, extra context

**Confluence Page**:
A manually added Confluence page attached as an optional Workspace Knowledge Source or Ticket Knowledge Source.
_Avoid_: Confluence space, Confluence search result

**Obsidian Folder**:
A folder in an Obsidian vault attached as a Workspace Knowledge Source. A Workspace can have multiple Obsidian Folders.
_Avoid_: vault, project notes

**Obsidian Note**:
A specific Markdown note in an Obsidian vault attached as a Ticket Knowledge Source. A ticket-key filename can be a creation convention, but the knowledge source points to an explicit note.
_Avoid_: scratchpad, pasted context

**Available Ticket**:
A Jira ticket returned by a Workspace's JQL that has no existing pin in that Workspace, including archived pins. Available Tickets show newly discoverable work without duplicating Workspace history.
_Avoid_: workspace ticket, assigned ticket

**Pinned Ticket**:
A Jira ticket intentionally attached to a Workspace by the developer. The same Jira ticket can be pinned to more than one Workspace, and each pin belongs to exactly one Workspace.
_Avoid_: JQL result, available ticket

**Unavailable Pinned Ticket**:
A Pinned Ticket that is no longer returned by the Workspace JQL. It remains in its Work Queue Order so the developer can decide whether to keep or unpin it.
_Avoid_: closed ticket, inactive ticket

**Archived Pinned Ticket**:
A Pinned Ticket kept in a Workspace's history but hidden from the active Work Queue. Archiving is the preferred way to remove a ticket from day-to-day planning while preserving local Workspace context.
_Avoid_: unpinned ticket, closed Jira ticket

**Opened Ticket**:
The Jira ticket currently shown in the ticket detail view. Opening a ticket lets the developer read its details and work with assistance, but does not by itself start time tracking.
_Avoid_: active ticket

**Open Jira Ticket**:
A global action that opens a Jira ticket by key without requiring it to be in a Workspace. It is for lookup and ad hoc work, not a replacement for Workspace pinning.
_Avoid_: global ticket search, pin ticket

**Ticket Detail**:
The view of an Opened Ticket where the developer reads Jira facts, uses Workspace knowledge sources and local notes, and prepares human-approved Jira comments.
_Avoid_: ticket tools, active ticket panel

**Jira Comment History**:
The complete comment thread of an Opened Ticket. It is part of the ticket context the developer expects to see and use for assistant-supported comment drafting.
_Avoid_: recent comments, activity feed

**Readable Jira Content**:
A markdown-like representation of Jira description and comments that preserves ordinary reading structure such as headings, lists, links, and code blocks while dropping Jira-specific rich formatting.
_Avoid_: raw ADF, plain text dump, full Jira renderer

**Assistant Answer**:
A local LLM response meant to help the developer reason about an Opened Ticket. It is not intended for publication as-is.
_Avoid_: comment draft, Jira comment

**Jira Comment Draft**:
An editable, locally persisted draft intended to become a Jira comment only after explicit developer approval. Each Pinned Ticket in a Workspace has at most one current Jira Comment Draft, and an Available Ticket must be pinned before it can have one.
_Avoid_: assistant answer, auto-comment

**Pomodoro Session**:
A manually started and stopped time-tracking interval for a Pinned Ticket. Starting a Pomodoro Session from an Available Ticket first makes that ticket a Pinned Ticket, and only one Pomodoro Session can be active in the app at a time.
_Avoid_: active ticket, timer target

**Session Note**:
A required, editable short freeform note captured when a Pomodoro Session ends, describing what was done during that session.
_Avoid_: work type, Jira comment draft, worklog draft

**Manual Work Session**:
A developer-entered work interval for any Jira ticket that was not captured by a Pomodoro Session. It includes time and a required Session Note, and is treated as worklog source material without requiring the ticket to be pinned to a Workspace.
_Avoid_: manual worklog draft, ad hoc Tempo entry

**Worklog Draft**:
A local, editable candidate Tempo entry built from all work sessions for the same Jira ticket and Worklog Date, even when those sessions came from different Workspaces. Its description can be summarized from Session Notes before the developer approves submission.
_Avoid_: session note, submitted worklog, automatic report

**Confirmed Worklog**:
A Worklog Draft that has been submitted to Tempo and verified there. Its source work sessions are not reused in future Worklog Drafts, and later local edits do not automatically update Tempo.
_Avoid_: local draft, pending worklog

**Reported Time**:
The editable duration in a Worklog Draft that the developer intends to submit to Tempo. It defaults from captured session time rounded up to a configurable step, and changing it does not modify the source work sessions.
_Avoid_: captured time, session duration

**Worklog Date**:
The day for which the developer is preparing or reviewing Worklog Drafts. The developer can change the Worklog Date to log previous days.
_Avoid_: date range, today-only report

**Daily Worklog Status**:
A compact summary of captured time, reported time, and pending worklog work for a day. It belongs on the dashboard as status, not as the full worklog editor.
_Avoid_: worklog screen, time report

**Worklog Description**:
A short phrase or sentence fragment in a Worklog Draft that summarizes the work done, such as "working on tables" or "update permissions". The assistant should produce one editable suggestion for it.
_Avoid_: Jira comment, detailed report, long summary

**Work Queue**:
The Pinned Tickets in a Workspace that the developer should consider from that Workspace's dashboard.
_Avoid_: sprint board, backlog

**Work Queue Order**:
The developer-controlled order of Pinned Tickets in a Workspace. Available Tickets keep the order returned by the Workspace JQL.
_Avoid_: Jira order, JQL order
