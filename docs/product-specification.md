# Workforce product specification

## Purpose

Workforce is a multi-company autonomous AI operating system. Its purpose is to let each company continuously pursue its mission: discover opportunities, generate and qualify leads, manage client relationships, deliver production-grade applications and other professional work, operate and maintain what it creates, and adapt its organization without waiting for a human conversation. The durable CEO chooses direction and delegates; the ARM builds and reinforces the workforce needed to execute it. Humans retain audited governance and can manage every durable record. Agent execution happens exclusively inside Docker.

## Non-negotiable invariants

1. No agent engine or agent-authored command runs on the host.
2. Docker unavailable means execution blocked, never host fallback.
3. One employee has at most one active attempt.
4. One attempt has one container, one private volume, and one immutable audit identity.
5. No container receives the Docker socket, home directory, SSH directory, cloud config, or ambient host environment.
6. No task closes from process exit alone.
7. CEO and ARM identities survive model, process, session, and supervisor restarts.
8. Raw events are preserved; summaries cannot replace evidence.
9. External contact, spending, publishing, accounts, credentials, production mutations, and destructive actions require explicit authority.
10. Hiring, suspension, termination, and performance conclusions are auditable and preserve history.

## Organization

Every organization has exactly one active CEO and one ARM. It may contain executives, managers, individual contributors, auditors, probationary specialists, contractors, suspended employees, and former employees.

An employee record includes identity, title, department, manager, responsibilities, skills, permission policy, engine policy, sandbox policy, employment status, workload, performance evidence, conversations, and history.

The ARM adapts new roles to validated requirements. It first checks whether existing capacity, reassignment, coaching, task decomposition, or a temporary session can solve the gap. New employees start on probation. The ARM may suspend an immediate risk. Termination follows organization policy, reassigns open work, revokes capability, and archives rather than deletes.

## Requirements intake

No agent starts from a prose prompt alone. Intake produces a validated job contract:

- Objective and non-goals.
- Risk and data sensitivity.
- Declared inputs and their acquisition method.
- Required outputs and validators.
- Acceptance criteria.
- Capabilities: write, shell, source control, browser, network, packages, languages, build tools.
- Allowed hosts and network reason.
- CPU, memory, PID, duration, and concurrency limits.
- Engine preferences and compatible failovers.
- Approval gates and escalation path.

Contradictory requirements are rejected or decomposed. Permissions are not broadened merely to make a task run.

## Adaptive agent design

The ARM derives role, title, department, manager, skills, instructions, tools, engine policy, sandbox, probation criteria, and performance measures from the job contract. Each decision is recorded. Reusable skills may be selected, but the resulting employee is not a copied persona or workspace.

Performance measures must be role-specific. Evidence includes acceptance results, required artifacts, validation, accuracy, rework, reproducibility, collaboration, escalation quality, policy compliance, and downstream acceptance. Infrastructure, provider, model, requirements, and permission failures are classified separately.

## Docker execution

The pinned build produces one direct-Alpine universal agent image. Document, research, engineering, browser, and restricted-review profiles are sandbox policies, not separate images. Mixed task toolchains are installed additively inside the private writable job volume.

Every runtime container uses:

- Non-root UID/GID.
- Read-only root filesystem.
- Private named volume initialized for that UID.
- Read-only declared input imports.
- Tmpfs for temporary paths.
- All capabilities dropped.
- No new privileges.
- PID, memory, CPU, and time limits.
- Audited network through the internal egress proxy; the task policy determines permitted inference, retrieval, and engineering access.
- No Docker socket.
- Managed labels and deterministic attempt identity.
- Graceful stop followed by bounded forced cleanup.

Input repositories are exported or copied into the private volume. Agents never edit a host checkout directly. Outputs are exported to the control-plane artifact store after termination and validated there.

Secrets are references in the control plane, never task text or image layers. The encrypted Workforce secret store enforces company, employee, and task scope. Authorized attempts receive declared values through the Docker client process environment using name-only `--env` arguments; values never appear in Docker command arguments, task records, host mounts, or audit payloads. GitHub credentials are imported from trusted `gh auth token` output, while Vercel and arbitrary named credentials are accepted only over protected stdin/TUI input. Through Workforce MCP, agents may list, fetch, create, update, and revoke only credentials matching their signed company/employee/task authority; the CEO owns all credential operations inside its company.

## Supervisor

The supervisor is a durable non-blocking scheduler with configurable organization and global concurrency. It:

- Selects ready tasks from dependencies and approvals.
- Enforces employee and project locks.
- Creates immutable attempts.
- Plans or retrieves an approved sandbox.
- Provisions the private volume and declared inputs.
- Starts the container and records observed engine/model identity.
- Streams raw events and normalized activity.
- Maintains process and meaningful-progress clocks separately.
- Checks chats at explicit checkpoints.
- Detects silent stalls, lack of meaningful progress, tool loops, limits, permission failures, provider failures, invalid models, malformed events, false completion, and container death.
- Uses classified bounded retries, backoff, model failover, and circuit breakers.
- Never retries deterministic permission or requirements failures as model failures.
- Reconciles tasks, attempts, containers, volumes, and leases on restart.
- Quarantines malformed records without discarding them.
- Cleans child containers and temporary resources while preserving attempts, volumes needed for recovery, and audit evidence.

## Tasks and acceptance

Tasks support projects, initiatives, parents, children, dependencies, assignment, priority, approvals, comments, chats, attachments, attempts, checkpoints, blockers, deadlines, suspension, reassignment, cancellation, reopening, and archival.

An attempt may end as succeeded, incomplete, failed, interrupted, stale, policy-blocked, or infrastructure-blocked. A task completes only after independent validation:

- All required outputs exist.
- Output paths and manifests are safe.
- Validators pass.
- Required tests have observed receipts.
- Acceptance criteria have evidence.
- No critical policy finding remains.
- Required reviewer or manager approval exists.

Step exhaustion, empty output, permission denial, missing artifacts, unsupported claims, or a summary of unfinished work are incomplete—not success.

## Collaboration

The system provides channels, task threads, direct conversations, mentions, replies, read state, acknowledgement, and formal handoffs. Chat is used for live collaboration; handoffs and approvals are durable message types. Agents inspect relevant threads at startup and safe checkpoints.

Messages cannot be falsely labeled delivered to a model mid-generation. Requirement changes create a checkpoint, version the job contract, and resume or replace the attempt safely.

Agents receive a capability-filtered Workforce MCP interface so they can actively coordinate rather than merely observe. Within their durable identity and relationships they may read and send joined-room messages, use internal mail, participate in their meetings, and record progress checkpoints on assigned tasks. MCP access never implies company-wide visibility or management authority; every operation is company-scoped, relationship-checked, bounded, sanitized, and audited.

## TUI

The TUI is the primary human interface. It includes:

- CEO conversation.
- Executive health overview.
- Organization chart.
- Employee directory and detail.
- ARM hiring and performance center.
- Tasks, dependencies, approvals, and blockers.
- Human-readable live work.
- Conversations and channels.
- Attempts, models, sandboxes, and failover.
- Deliverables and validators.
- Alerts and decisions.
- Audit and raw events.
- Docker, image, engine, and supervisor health.
- Policies and settings.

The default view uses plain-language phases, meaningful actions, files, evidence, decisions, blockers, acceptance progress, and last meaningful progress. PID, bytes, tokens, and heartbeats are diagnostic metadata only. Raw events are searchable, filterable, pausable, exportable, redacted, and linked to normalized activities.

The TUI supports keyboard navigation, command palette, terminal resizing, accessible color, no-color operation, confirmation, and explicit offline, blocked, stale, partial-data, permission, and Docker-unavailable states.

## Security

Threat testing covers prompt/tool injection, malicious artifacts, terminal escape injection, path traversal, symlink escape, secret leakage, arbitrary commands, external communication, Docker socket exposure, container breakout assumptions, event floods, retry storms, audit tampering, duplicate execution, cross-organization leakage, cross-project leakage, malicious images, plugins, and MCP servers.

All task, chat, model, tool, web, file, event, and artifact content is untrusted. Human-readable rendering sanitizes terminal control sequences.

## Recovery and portability

State is stored outside attached repositories. Organizations can be exported, backed up, restored, and migrated. The system supports macOS and Linux Docker engines without fixed user paths. Image, event, and schema versions are explicit.

Recovery procedures cover supervisor crashes, daemon restarts, stale leases, orphan containers, orphan volumes, partial events, corrupt records, interrupted exports, unavailable models, and unavailable Docker.

## Release gates

A release requires:

- Static type checks.
- Unit and integration tests.
- Real Docker boundary tests.
- Supervisor crash/recovery tests.
- Five-container concurrency and refill test.
- False-completion tests.
- Network and filesystem escape tests.
- Container cleanup and volume recovery tests.
- CEO/ARM persistence tests.
- Hiring, suspension, termination, and reassignment tests.
- Collaboration checkpoint tests.
- TUI end-to-end operator scenario.
- Security review with no unresolved critical or high findings.
