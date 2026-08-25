# Workforce completion handoff

This is the single authoritative continuation handoff. Keep this file current after every coherent
slice; do not create another handoff, prompt export, or competing requirements plan elsewhere.

## Product goal

Ship a usable multi-company autonomous AI company operating system. Each company has a durable CEO that chooses direction and delegates work, plus a durable Agent Resources Manager (ARM) that designs and adapts the workforce. Agents execute only in isolated Docker attempts. Humans operate and govern the company through the TUI, while all consequential decisions and evidence remain auditable.

This is a reduced path to a viable release, not a reduction of the product identity. Autonomous CEO and ARM operation, real Docker execution, independent acceptance, persistence, and human control are release requirements.

## Non-negotiable product requirements

- A user can operate multiple isolated companies. Each company owns one durable CEO and one durable
  Agent Resources Manager; automation creates and manages the remaining workforce by default while
  preserving human management authority.
- The CEO is a continuous non-conversational company operator. It chooses direction, maintains the
  business, delegates governed work, and records bounded reasons for acting or waiting. The ARM owns
  capability analysis, dynamic identities/personas/prompts/instructions, hiring, reinforcement,
  reassignment, suspension, termination, and record-preserving offboarding.
- Every agent engine and agent-authored command runs in a job-specific Docker container. Docker
  unavailability blocks execution; there is no host fallback and no Docker socket, host home,
  credential directory, or whole repository mount.
- One direct-Alpine universal agent image supports browser and mixed work. Approved additive bundles
  share the private writable job volume, and every production image must remain below 500 MiB.
- Network use is policy-authorized and audited. Inference remains available to running agents;
  broader research/engineering access follows the task policy. Secrets are encrypted, company and
  principal scoped, never put in command arguments, and usable through authorized Workforce MCP.
- Workforce MCP lets authorized humans and agents read and mutate their permitted company work,
  including tasks, rooms, messages, meetings, mail, business records, registries, automations,
  evidence, and scoped secrets. Capabilities never imply cross-company access.
- All persistent schema changes are forward-only numbered SQL files applied transactionally through
  `schema_migrations`; runtime initialization contains no ad hoc schema creation.
- The keyboard-first TUI is the complete human operating surface. It uses configured unique keys and
  themes, opaque dialogs, focused panels, contextual help, real lifecycle actions, audit confirmation,
  and human-friendly selectors. Generated IDs, timestamps, current company/human identity, selected
  records, and safe lifecycle defaults are inferred instead of requested as free text.
- A zero exit code is not acceptance. Required artifacts, deterministic validators, claims/evidence,
  unresolved critical findings, recovery, bounded logs/resources, and audit integrity decide success.
- Keep domain types, repositories, services, views, and forms separate and below the configured
  300-line limit. Delete dead files, exports, dependencies, facades, tests, and stale documentation in
  the slice that supersedes them.

## Current verified baseline (2026-08-25)

- Business pipeline MCP, viable CEO commercial autonomy, and ARM reinforcement are implemented.
- The full local quality gate currently passes formatting, typed lint, Knip dead-code analysis,
  compilation, migrations, and **108 tests**.
- TUI truthfulness: no view renders its own key-hint footer (status bar via `section-guidance.ts` is
  the only guidance source); capacity claims derive from `DEFAULT_AGENT_CONCURRENCY`; the
  performance page shows real record counts.
- First-run guidance: execution readiness explains a blocked autonomy loop with the latest CEO cycle
  failure reason and retry cadence; the executive overview shows a Getting started checklist
  (configure model → verify → describe work → run task) until every step is done, and states that
  identities persist while containers run only during attempts.
- Human forms now generate company/model/MCP/tool/environment IDs; infer company, actor, timestamps,
  approval targets, and safe defaults; and select company-scoped relationships by readable names.
  This covers organization, strategy, business, governance, meetings, automations, project
  integrations, profiles, tasks, rooms, mail, and registries. Evidence and polymorphic claim
  references remain explicit because they are the governed input.
- A compiled production-TUI operator test now covers onboarding, durable CEO/ARM identities,
  objective creation, model registration and verification, assigned task creation, execution
  confirmation, independently accepted evidence, deliverable inspection, and restart persistence.
  Its execution callback is deliberately deterministic; it proves the TUI/service seam, not the
  real-Docker boundary reserved for Slice 2.
- The remaining human-workflow work is the broader page/action audit, especially compact resize and
  archive/restore coverage, collaboration/governance paths, and exact guide parity. Compact mode now
  uses tested width thresholds, hides the sidebar below 64 columns without leaving hidden focus behind,
  and falls back to usable dimensions on non-TTY output. A child-process render proves `NO_COLOR`
  removes Ink styling while retaining required cursor controls.
- Every configured navigation destination now has a compiled render-contract test. Unknown sections
  fail visibly instead of silently falling through to Advanced diagnostics.
- The bottom bar explicitly labels immutable evidence, audit, readiness, runtime, and diagnostics
  pages as read-only, and the executive overview advertises its configured left/right panel controls.
- Conversations now offers an explicit room/thread/message/attachment creation chooser. Thread, room,
  and message relationships use named selectors, human authorship is inferred, and messages can target
  an open thread without requesting internal IDs. Attachment registration accepts validated artifact
  metadata and never imports arbitrary host files.
- Claim creation now selects readable company-scoped employees, tasks, strategy, opportunities, leads,
  clients, or engagements instead of asking the operator for a raw subject ID. Evidence references
  remain explicit because they are the governed basis of the claim.
- The page/action audit is closed. The executive overview reports the real validated deliverable
  count instead of a hardcoded zero. Approvals, hiring proposals, models, tools, and environments now
  refuse archive/restore before any confirmation dialog with an explicit explanation (governed
  decision workflow, retained execution history, or registry management through Edit and
  verification). Conversations lists rooms and primary-room threads as one selectable row set;
  `d`/`u` archive and restore both, closing threads to new messages; pressing `e` on a thread
  explains that threads support archive/restore only. The getting-started guide documents every
  configured key including `k`/`j`, `p`, `Space`, `y`, `t`, and thread archival.

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

## Slice 1 — Close the human operating workflow

**Implementation status:** complete. Navigation/focus, configured keys/themes, opaque dialogs,
contextual guidance, simplified human-facing forms, business/governance workflows, durable
timelines, the compiled operator journey, page/action audit, archive/restore coverage including
threads, pre-confirmation lifecycle refusals, and exact getting-started-guide parity are done and
tested.

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

## Slice 2 — Execution and recovery release gate

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

## Slice 3 — Viable release audit and cleanup

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

Complete the remaining slices in order: close the human operating surface, prove execution and
recovery against real Docker boundaries, then remove drift and verify the complete release story.

After the viable release, resume external operator HTTP MCP, broader integrations, expanded creative tool bundles, advanced business optimization, exhaustive adversarial testing, and additional interface polish as separately versioned work.

## Continuation prompt

Give the next coding agent this prompt together with the repository:

> You are the principal engineer continuing Workforce. Read `AGENTS.md`,
> `docs/viable-release-plan.md`, `docs/product-specification.md`, `docs/architecture.md`, and
> `docs/coding-standards.md` completely before editing. Treat the handoff as the living completion
> checklist and update it after every coherent slice. Start with `git status --short`, inspect all
> uncommitted work, and preserve it. Finish the in-progress TUI human-workflow slice first. The compiled
> operator journey and form simplification are complete; now audit the remaining page actions,
> collaboration/governance paths, archive/restore behavior, and exact getting-started-guide parity.
> Compact resize and no-color policies already have direct tests; preserve them. Keep generated values
> and safe defaults inferred, genuine relationships name-selected and company-scoped, and advanced
> policy inputs limited to policy forms.
> Then execute Slices 2 and 3 in order. For each
> slice, implement domain/repository policy before UI, use only numbered SQL migrations for persistence,
> preserve Docker-only execution and all isolation/security invariants, delete superseded code/docs,
> run `pnpm format && pnpm test && git diff --check`, and commit only coherent green work. Do not claim
> completion until the compiled production TUI, real Docker/recovery/image gates, persistence,
> multi-company isolation, artifacts/evidence, audit integrity, documentation, CI, and clean Git tree
> all have direct evidence.
