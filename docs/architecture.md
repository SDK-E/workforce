# Architecture

## Trust boundary

The host is the trusted control plane. It stores organization identities, tasks, chats, policies, sandbox specifications, normalized activities, raw-event references, approvals, and audit events. It may invoke Docker only through a narrow runtime adapter.

Agent engines, model sessions, browser processes, package managers, build tools, shell commands, and job files live in per-attempt containers. Containers never receive the Docker socket. Inputs are copied into private Docker volumes; outputs are exported and validated after termination.

## Adaptive sandbox planner

The Agent Resources Manager must first turn a job into explicit requirements: risk, data sensitivity, capabilities, declared inputs, required outputs, network hosts, resources, engines, and acceptance criteria. The planner derives a sandbox profile and records every decision. It refuses contradictory capabilities rather than broadening permissions.

Profiles are starting points, not copied employee workspaces:

- Document: file output without shell or network.
- Research: public network through the audited internal Tinyproxy network when approved.
- Engineering: shell/build tools; approved registry, API, or web access uses audited egress.
- Browser: Playwright plus approved audited egress.
- Restricted review: no public network and no mutation beyond outputs.

Direct agent bridge networking is forbidden. Network-disabled attempts use Docker's `none` network. Network-capable attempts join only an internal agent network and reach external services through the separately managed, logged proxy container.

## Persistence boundaries

Repositories are company-scoped and domain-specific. Organization units and strategy items are separate typed aggregates; the superseded generic entity table was removed by migration 4. Application views read through repositories and services rather than issuing SQLite statements.

Every forward-only migration is a separately versioned SQL file in `src/storage/migrations` (`001.sql`, `002.sql`, and so on). The loader requires a contiguous sequence and records each successfully applied version in `schema_migrations`; production builds copy the same SQL files beside the compiled database adapter.

## Conversations

The conversation application service composes separate room, thread, message, and attachment repositories. Rooms own membership, announcements, retention, and archival state. Threads and messages validate their company/room parents. Edits, redactions, pins, membership changes, and attachments are durable audit events; attachment records require SHA-256 digests and artifact URIs rather than embedding files in SQLite.

Agent mail crosses the sandbox boundary without exposing the control-plane database. A task granted `workforce-mail` receives a bounded immutable inbox snapshot. It may emit a `workforce-mail-outbox.json` artifact; only after archive validation and secret scanning does the control plane validate its schema, enforce the attempt employee as sender, re-check company-scoped recipients, and persist the messages with audit events.

Conversation rooms are managed records rather than implicit UI state. The Conversations area provides selected-row creation, editing, archival, and restoration for room names, kinds, announcements, and retention policies; the CEO office remains the focused message composer. Threads, memberships, messages, pins, redactions, and attachments retain company and room isolation.

## No host fallback

Docker unavailability is a blocked execution state. The control plane, TUI, CEO, ARM, task management, and conversations remain available; no agent work begins.

## Durable supervisor

The Execa Docker adapter invokes only control-plane-authored Docker argument arrays and never a host shell. Attempts, leases, status events, and bounded output are durable. The scheduler starts two containers by default, reduces to one under memory pressure, and refills freed capacity from its FIFO queue. Startup reconciliation expires stale leases and removes labeled orphan containers. Timeouts, infrastructure failures, non-zero exits, and emergency stops are distinct terminal states. Docker unavailability moves queued work to an explicit infrastructure-blocked state and never selects a host execution path.

Every role runs the same direct-Alpine universal agent image. It contains both inference engines, Chromium, Node.js, Git, Bash, Zsh, and audited retrieval utilities. The rootless `workforce-toolchain` resolver can add any combination of Python, PHP/Composer/Laravel/Symfony, Go, Rust, Pandoc/office/PDF, ImageMagick, FFmpeg, and the pinned official Beads CLI beneath `/work/.tools`; requests are additive within the private writable volume and never modify the read-only root filesystem. Beads is provisioned only when an active project integration grants `integration:beads`. The image keeps only target-architecture engine distributions and includes Alpine's glibc compatibility layer for the official Beads binary. The verified universal image is 468,959,095 bytes, below the strict 500 MiB (524,288,000-byte) build limit.

MCP servers begin unverified and cannot be granted to tasks until a health receipt exists. The TUI health action launches a non-root, read-only, capability-dropped Docker probe that performs the MCP initialize handshake for local stdio or remote HTTP/SSE transports. Scoped credentials enter only through environment names, probe output is bounded, and the resulting receipt—not a form field—sets server health.

Kilo and OpenCode have separate command adapters. The supervisor rejects commands that were not produced in the selected adapter's non-interactive `run --model provider/model objective` shape. Image verification executes both pinned engines with networking disabled and validates their reported versions. Circuit-breaker policy selects a compatible fallback after repeated model failures and reopens a provider only after cooldown.

Model registry entries are company-scoped records. The TUI can configure and revise their engine, provider, model identifier, priority, capabilities, roles, and required secret names, but an identity change clears any prior health receipt. Verification retrieves narrowly scoped secrets, passes values only through the Docker client environment with name-only arguments, and invokes the actual engine/model inside the hardened universal image through audited egress. Bounded output is redacted before a receipt and audit event are stored. A task only selects a non-placeholder model whose health and independent verification permit execution; configuration alone never asserts that a provider is safe or reachable.

## Acceptance

Container completion is only an attempt result. Independent control-plane validation checks required outputs, manifests, tests, policy violations, step exhaustion, permission failures, and acceptance criteria before a task can close.

## Automations

Agents may propose validated interval or strict cron automations, but proposals do not execute until approved. Approved actions are typed task templates rather than arbitrary commands. The scheduler calculates occurrences with `cron-parser`, creates ordinary audited company-scoped tasks, and dispatches them through the same Docker execution and acceptance path as human-created work. Each scheduled occurrence has a unique durable run record, preventing duplicate execution after repeated ticks or restarts; disable, archive, and restore preserve history.

Company deletion is record-preserving archival. Migration `022.sql` persists the lifecycle status and the pre-archive autonomy setting. Archival is refused while attempts are active, stops CEO and ARM operating cycles, and disables approved automations; restoration preserves durable CEO/ARM identities and restores the prior autonomy choice instead of always starting the company. Archived companies remain visible in the multi-company TUI and must be restored before activation.

Task creation validates company-scoped project, parent-task, manager, assignee, and reviewer relationships. Requirements begin at version 1 and every objective, non-goal, acceptance, capability, network, or resource change creates an immutable version with actor and rationale. If an attempt is starting or running, a change is rejected unless it names an explicit safe checkpoint. Task dependencies are company-scoped and cannot self-reference.

## Workforce governance

Approval and employment transitions are XState machines; invalid or terminal transitions fail before persistence. The ARM records a capability, capacity, or temporary gap and evaluated alternatives before proposing a job-derived employee. Approved hires start on probation. Promotions, coaching, restrictions, reassignment, suspension, termination, reinstatement, and archival append immutable transition and audit records. Termination changes status and revokes eligibility without deleting the employee or their history. CEO and ARM identities are protected from this general transition workflow.

The Employees TUI uses the same governed employment service as automation. A human hire declares an objective, capability tokens, and measurable probation criteria; the ARM designer derives the sandbox, persona, system prompt, instructions, and durable identity before the human approval is recorded. Selected employees can have their versioned profile edited, or be terminated and reinstated through confirmed lifecycle actions. Offboarding is blocked by active attempts, releases unfinished assignments, and reassigns direct reports without deleting any records.

Meeting, incident, and corrective-action lifecycles are also XState machines. Meetings preserve agenda, participants, minutes, and owned action items. Incidents require evidence and severity before corrective actions can be drafted. Recognition, warnings, reviews, and challenges require evidence references. The claim ledger marks conflicting active values for the same subject and predicate as disputed and links both sides of the contradiction for human or shadow review.

Meetings are record-preserving managed resources: planned meetings may be edited; lifecycle archival cancels any planned or active meeting before archival; restoration returns an archived meeting to planned. The Meetings TUI uses selected-row create/edit/archive/restore actions with opaque confirmations and audit history.
