# Workforce viable-release plan and OpenCode handoff

## Product goal

Ship a usable multi-company autonomous AI company operating system. Each company has a durable CEO that chooses direction and delegates work, plus a durable Agent Resources Manager (ARM) that designs and adapts the workforce. Agents execute only in isolated Docker attempts. Humans operate and govern the company through the TUI, while all consequential decisions and evidence remain auditable.

This is a reduced path to a viable release, not a reduction of the product identity. Autonomous CEO and ARM operation, real Docker execution, independent acceptance, persistence, and human control are release requirements.

## What to defer until after the viable release

- Public or remote external-operator HTTP access; retain local stdio MCP and internal attempt MCP.
- MCP Inspector certification and exhaustive flood campaigns beyond bounded release smoke tests.
- Every imaginable language and creative tool preinstalled in the base image. Keep the universal runtime small and install approved additive bundles into private job volumes.
- Advanced CRM, accounting, billing, contract-signing, calendar, and mass-outreach integrations.
- Pixel-perfect TUI polish and mouse support beyond a coherent keyboard-first workflow.
- Sophisticated autonomous market optimization. The viable CEO loop needs a safe, evidence-backed operating cycle, not an omniscient business strategist.

Do not defer Docker isolation, company isolation, scoped credentials, audit integrity, confirmation of human mutations, acceptance validation, recovery, or autonomy.

## Working rules for every slice

1. Inspect the current worktree, recent commits, repository instructions, product specification, architecture, and existing tests before editing.
2. Preserve unrelated user changes. Never replace Docker execution with a host fallback.
3. Use forward-only numbered SQL migration files. Do not create schema from application initialization code.
4. Keep domain types, repositories, services, TUI views, and overlays in coherent separate files under the 300-line boundary.
5. Prefer maintained open-source packages already selected by the repository over custom infrastructure.
6. Delete superseded files, exports, tests, documentation, and compatibility paths in the same slice.
7. Validate company and parent relationships inside repositories/services, not only in forms.
8. Treat model output, messages, MCP calls, container output, artifacts, and external content as untrusted.
9. End each slice with formatting, static checks, dead-code checks, tests, build, documentation updates, and a clean commit.
10. Do not claim a broad requirement from a narrow unit test. Record the concrete evidence used for acceptance.

## Slice 1 — Finish business pipeline MCP

### Outcome

CEO-authorized sessions can search, create, update, archive, and restore opportunities, leads, clients, and engagements through Workforce MCP. ARM can read the pipeline. Ordinary employees do not gain business-wide authority unless explicitly delegated later.

### Required acceptance evidence

- Official MCP SDK client discovers only capability-authorized tools.
- Full opportunity-to-engagement flow works with validated same-company parent references.
- Identical idempotency replay returns the original result; changed-payload replay is rejected.
- Cross-company IDs and principals are rejected.
- Every successful read and mutation produces an MCP-origin audit event without secret data.
- Formatting, types, lint, dead-code analysis, all tests, and build pass.

### OpenCode prompt

> Continue the Workforce repository from its current worktree and complete the partially implemented business pipeline MCP slice. First inspect all modified files and the existing MCP service, authorization, idempotency, repository, and official-client test patterns. Expose capability-filtered tools for listing, saving, archiving, and restoring opportunities, leads, clients, and engagements through application services only—never direct SQL. CEO receives company-scoped read and mutation authority; ARM receives read authority; other principals see no new tools unless their immutable capabilities allow them. Enforce same-company ownership and parent relationships in the repositories, bound and sanitize every input/result, make consequential operations idempotent with changed-request replay denial, and append non-secret MCP audit evidence. Add official Model Context Protocol SDK integration tests for discovery, the complete business conversion flow, replay, archive/restore, missing capability, and cross-company denial. Keep modules coherent and below repository line limits. Update Workforce MCP and user documentation, remove superseded code, run the complete quality suite, and commit only after it is green.

## Slice 2 — Viable CEO commercial autonomy

**Implementation status:** complete in the current repository; retain the acceptance requirements below as regression gates.

### Outcome

The durable CEO performs a continuous, non-conversational operating cycle: reads company mission and current evidence, chooses an allowed strategic action, maintains the business pipeline, creates measurable objectives or work, delegates execution, and records why it acted or why it safely did nothing.

### Required acceptance evidence

- Restart preserves CEO identity and prevents duplicate operating-cycle effects.
- A company with no active strategy can produce a governed, measurable objective and task based on its configured mission.
- CEO can progress a validated opportunity through the business pipeline and launch a delivery engagement only when evidence and policy allow it.
- External contact, spending, publishing, account creation, contracts, credentials, destructive actions, and production changes create explicit approval requirements unless company policy grants narrowly defined authority.
- Every cycle is bounded, idempotent, company-isolated, auditable, and cannot execute shell or an agent engine on the host.
- “No safe action” is a legitimate recorded outcome and does not cause a busy loop.

### OpenCode prompt

> Implement the viable autonomous CEO operating slice for Workforce. Treat the product specification and repository invariants as authoritative. Inspect the current CEO loop, operating-cycle records, strategy repositories, business pipeline, task services, approvals, organizational briefing, scheduler, and Docker dispatch path. Replace any decorative or event-only CEO behavior with a durable state-driven cycle that reads the configured company mission, policies, strategy, current capacity, pending decisions, work, evidence, and business pipeline; selects one bounded next action; and either maintains strategy, records or qualifies an opportunity, creates a measurable objective/task, delegates work, or records a reasoned no-op. Never let the CEO invoke host commands or bypass normal Docker attempts and independent acceptance. Require explicit governed authority for external contact, spending, publishing, accounts, contracts, credentials, destructive actions, and production mutation unless a company-scoped policy explicitly authorizes the exact class of action. Make cycles idempotent across ticks and restarts, prevent duplicate tasks, isolate companies, store normalized and raw decision evidence, and surface the latest CEO decision and blocker in the TUI. Add deterministic unit and integration tests using controlled decision inputs rather than live inference. Update docs and delete superseded simulated-cycle behavior before running the full quality suite.

## Slice 3 — Viable ARM adaptation and reinforcement

**Implementation status:** complete in the current repository; retain the acceptance requirements below as regression gates.

### Outcome

The ARM continuously evaluates verified capacity, capability, and performance evidence; tries reassignment or reinforcement first; proposes or performs policy-authorized probationary hiring; and preserves work and records during suspension or offboarding.

### Required acceptance evidence

- Durable ARM identity survives restart.
- Gap analysis distinguishes capability, capacity, task-definition, provider, infrastructure, and permission failures.
- Reinforcement plans have measurable criteria and review dates.
- Repeated verified poor performance can lead to reassignment, warning, suspension, or termination through valid state-machine transitions.
- Hiring is based on an unresolved verified gap and starts on probation.
- Termination revokes future authority, reassigns open work, and preserves all employee history and evidence.

### OpenCode prompt

> Complete a viable autonomous ARM loop for Workforce. Inspect the existing ARM loop, agent designer, employment and corrective-action XState machines, performance evidence, attempts, acceptance results, workload, task requirements, approvals, and employee repositories. On each bounded durable cycle, classify real workforce gaps and failures before acting. Prefer clarification, task decomposition, coaching/reinforcement, reassignment, or temporary capacity when appropriate; create a probationary hire proposal only for a remaining verified capability or capacity gap. Build measurable reinforcement plans from evidence without blaming employees for model-provider, infrastructure, permission, or malformed-requirement failures. Allow policy-authorized lifecycle actions only through the existing state machines and approval services. Offboarding must revoke future attempt/MCP/secret authority, reassign open work, preserve conversations and evidence, and never delete the employee. Prevent duplicate proposals and actions across ticks and restart. Surface ARM reasoning, gaps, reinforcement status, and decisions in the TUI. Add deterministic transition, classification, restart, isolation, and record-preservation tests; update documentation and remove obsolete simulated behavior.

## Slice 4 — Close the human operating workflow

### Outcome

A non-developer can create and operate multiple companies entirely from the TUI: configure the company and model, organize people, create work, approve decisions, manage the business pipeline, communicate, inspect real attempts, and recover records.

### Required acceptance evidence

- Every visible management page is either genuinely actionable or intentionally read-only with a clear explanation; no decorative placeholders.
- Focus, arrows, command palette, escape, confirmation, selection, forms, collapsed sidebar, resizing, no-color mode, and theme selection work consistently.
- Create/edit/archive/restore is available for the viable domains where policy allows it.
- The top bar distinguishes durable identities from active Docker containers.
- A compiled-TUI operator test covers first company through accepted deliverable and restart.
- The TUI getting-started guide matches the observed interface.

### OpenCode prompt

> Audit and close the viable human workflow in the Workforce Ink TUI. Use the actual compiled interface and existing interaction tests. Walk from first launch through company creation, policy and model configuration, model verification, organization review, objective and task creation, assignment, approval, Docker execution, live timeline, deliverable acceptance, business pipeline management, collaboration, governance decisions, archive/restore, shutdown, restart, and persistence. Fix every focus or navigation mismatch found: hidden sidebar input, arrow routing, dashboard activation, record selection, command palette up/down and escape, overlay opacity, confirmation, form errors, compact layouts, no-color output, and contextual help. Ensure no key chord has multiple commands and all bindings/themes come from configuration modules. Remove decorative placeholders and stale views rather than hiding them. Add focused Ink tests plus one compiled production operator scenario, update the non-developer starting guide to exactly match behavior, and keep views, overlays, controllers, and domain services in separate coherent files.

## Slice 5 — Execution and recovery release gate

### Outcome

Approved tasks reliably become real isolated Docker attempts, obtain only authorized tools/network/secrets, produce exportable artifacts, pass independent acceptance, and recover from daemon or Docker interruptions without leaks or false success.

### Required acceptance evidence

- Real Docker tests cover two active attempts and queued refill, or the configured viable concurrency if deliberately changed and documented.
- No agent engine or authored command runs on the host; Docker unavailable blocks execution.
- Containers have read-only roots, private writable volumes, dropped capabilities, bounded resources/logs/time, no Docker socket or host credential mounts, and audited egress.
- Model startup identity is verified and classified failover does not retry deterministic permission or requirements failures.
- Daemon/Docker restart reconciles leases, running/orphan containers, attempts, and volumes.
- Successful exit without required evidence stays incomplete.
- Production image is below 500 MiB and no managed containers remain after the suite.

### OpenCode prompt

> Run the Workforce execution platform through its viable production release gate and fix every contradicted requirement. Inspect the daemon lifecycle, task execution service, sandbox planner, Docker client and supervisor, leases, capacity queue, attempt events, egress proxy, secret injection, model verification, artifact export, acceptance evaluator, recovery, and image build. Use real Docker boundary tests, not only mocks, to prove queue refill, employee locking, read-only root, private named workspace volume, resource limits, bounded logs and timeout cleanup, absence of Docker socket and host credential/home/repository mounts, audited policy-based internet, scoped environment-only secret injection without command-line exposure, verified model startup, classified retry/failover, daemon and Docker restart reconciliation, orphan cleanup, and zero leftover managed containers. Prove process exit cannot complete missing deliverables. Keep one direct-Alpine universal image below 500 MiB; use approved additive toolchain bundles in private volumes instead of bloating the base image, and clean all package caches and build dependencies. Update operational and recovery documentation with actual commands and observed evidence.

## Slice 6 — Viable release audit and cleanup

### Outcome

The repository and persisted runtime pass a requirement-by-requirement release audit with no dead implementation paths, stale documentation, unapplied migrations, or unverified release claims.

### Required acceptance evidence

- Fresh database and upgraded persistent database both apply every numbered SQL migration transactionally.
- No schema creation remains in runtime initialization outside the migration mechanism.
- Format, typed lint, type check, dead-code/dependency checks, unit/integration/TUI tests, build, Docker boundary tests, image-size gate, backup/restore, and audit-chain validation pass.
- Documentation index, README, non-developer guide, architecture, product specification, MCP guide, contributing, license, security, and CI describe the actual viable release.
- Dead files, exports, dependencies, compatibility facades, duplicate docs, and generated debris are removed.
- Git status is clean after the final release commit.

### OpenCode prompt

> Perform the final viable-release audit for Workforce. Do not infer completion from existing green tests. Derive a checklist from the product specification, repository instructions, viable-release plan, README commands, migration rules, security invariants, and release gates. For every item, identify and inspect authoritative code, test, runtime, Docker, database, documentation, or Git evidence. Exercise both a fresh state and an upgrade of preserved state through all forward-only numbered SQL migrations, and search for application-level schema creation. Run the complete static, dead-code, test, build, compiled-TUI, real-Docker, image-size, recovery, backup/restore, isolation, secret-scope, audit-integrity, CEO/ARM persistence, autonomy, and false-completion gates. Fix failures rather than weakening assertions. Delete dead files, exports, dependencies, facades, duplicate or stale docs, generated debris, and unused CI paths. Update all user and contributor documentation to describe observed behavior and explicitly list any intentionally deferred post-release work. Finish with a clean Git tree and a concise evidence matrix; do not declare release readiness while any required evidence is missing or indirect.

## Viable release sequence

Complete the slices in order. Business MCP gives the CEO a governed commercial interface; CEO autonomy then produces work; ARM autonomy supplies and reinforces the workforce; the TUI closes human operation; execution/recovery proves the work is real; the final audit removes drift and verifies the whole story.

After the viable release, resume external operator HTTP MCP, broader integrations, expanded creative tool bundles, advanced business optimization, exhaustive adversarial testing, and additional interface polish as separately versioned work.
