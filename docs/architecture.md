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

## Acceptance

Container completion is only an attempt result. Independent control-plane validation checks required outputs, manifests, tests, policy violations, step exhaustion, permission failures, and acceptance criteria before a task can close.

## Workforce governance

Approval and employment transitions are XState machines; invalid or terminal transitions fail before persistence. The ARM records a capability, capacity, or temporary gap and evaluated alternatives before proposing a job-derived employee. Approved hires start on probation. Promotions, coaching, restrictions, reassignment, suspension, termination, reinstatement, and archival append immutable transition and audit records. Termination changes status and revokes eligibility without deleting the employee or their history. CEO and ARM identities are protected from this general transition workflow.
