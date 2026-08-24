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

## No host fallback

Docker unavailability is a blocked execution state. The control plane, TUI, CEO, ARM, task management, and conversations remain available; no agent work begins.

## Durable supervisor

The Execa Docker adapter invokes only control-plane-authored Docker argument arrays and never a host shell. Attempts, leases, status events, and bounded output are durable. The scheduler starts two containers by default, reduces to one under memory pressure, and refills freed capacity from its FIFO queue. Startup reconciliation expires stale leases and removes labeled orphan containers. Timeouts, infrastructure failures, non-zero exits, and emergency stops are distinct terminal states. Docker unavailability moves queued work to an explicit infrastructure-blocked state and never selects a host execution path.

Production profiles are separately built for document, research, engineering, browser, and restricted-review work. The build gate inspects every profile and the Tinyproxy image; the currently verified browser image is the largest at 488,159,650 bytes, below the 500 MiB limit.

Kilo and OpenCode have separate command adapters. The supervisor rejects commands that were not produced in the selected adapter's non-interactive `run --model provider/model objective` shape. Image verification executes both pinned engines with networking disabled and validates their reported versions. Circuit-breaker policy selects a compatible fallback after repeated model failures and reopens a provider only after cooldown.

## Acceptance

Container completion is only an attempt result. Independent control-plane validation checks required outputs, manifests, tests, policy violations, step exhaustion, permission failures, and acceptance criteria before a task can close.

Task creation validates company-scoped project, parent-task, manager, assignee, and reviewer relationships. Requirements begin at version 1 and every objective, non-goal, acceptance, capability, network, or resource change creates an immutable version with actor and rationale. If an attempt is starting or running, a change is rejected unless it names an explicit safe checkpoint. Task dependencies are company-scoped and cannot self-reference.

## Workforce governance

Approval and employment transitions are XState machines; invalid or terminal transitions fail before persistence. The ARM records a capability, capacity, or temporary gap and evaluated alternatives before proposing a job-derived employee. Approved hires start on probation. Promotions, coaching, restrictions, reassignment, suspension, termination, reinstatement, and archival append immutable transition and audit records. Termination changes status and revokes eligibility without deleting the employee or their history. CEO and ARM identities are protected from this general transition workflow.

Meeting, incident, and corrective-action lifecycles are also XState machines. Meetings preserve agenda, participants, minutes, and owned action items. Incidents require evidence and severity before corrective actions can be drafted. Recognition, warnings, reviews, and challenges require evidence references. The claim ledger marks conflicting active values for the same subject and predicate as disputed and links both sides of the contradiction for human or shadow review.
