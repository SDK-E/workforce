# Workforce completion handoff

This document is the operational handoff for an autonomous coding agent (for example OpenCode Ox Alpha). It is intentionally evidence-based: do not declare the product complete until the final acceptance audit in this document passes.

## Goal

Complete Workforce as a production-grade, multi-company AI Workforce Operating System:

- durable per-company CEO and Agent Resources Manager (ARM) identities;
- autonomous CEO/ARM/automation work loops that execute agents only in Docker;
- company-scoped, auditable organizations, strategy, tasks, employees, conversations, integrations, registries, and governance;
- one Alpine-based universal agent image below 500 MiB, with additive mixed language/toolchain bundles in private writable volumes;
- broad audited internet for approved work, scoped secrets, MCP, Beads, mail, artifacts, independent acceptance validation, and Docker recovery;
- an organized, accessible Ink TUI with real, confirmed management actions instead of decorative placeholders;
- forward-only numbered SQL migrations, coherent modules, dead-code removal, docs, CI, and a clean repository.

## Non-negotiable guardrails

Read [`AGENTS.md`](AGENTS.md), [`docs/architecture.md`](docs/architecture.md), [`docs/product-specification.md`](docs/product-specification.md), and [`docs/coding-standards.md`](docs/coding-standards.md) before making changes.

- Never execute an agent engine or agent-authored shell command on the host.
- Docker unavailable means execution is visibly blocked; never add a host fallback.
- Never mount Docker socket, host home, credentials, SSH directory, or a repository wholesale into an agent container.
- Treat agent/model/tool/artifact/message output as untrusted.
- Preserve records with archival/restoration; do not silently delete history.
- Every persistent schema change is a new numbered `.sql` file under `src/storage/migrations/`; never edit an applied migration.
- Keep modules under the configured 300-line boundary. Split by feature/view/form/repository instead of growing god files.
- Prefer maintained packages. Document generic package decisions in `docs/package-decisions.md`.
- Do not weaken egress, secret scope, company/project isolation, audit, or acceptance checks merely to make tests pass.

## What is completed and evidenced

### Foundation and data

- SQLite uses forward-only numbered SQL migrations with `schema_migrations`.
- Legacy generic entity infrastructure was removed; typed repositories own organization, strategy, tasks, governance, conversations, registries, and integrations.
- Company isolation, audit chain verification, terminal sanitization, and versioned requirements/instructions are tested.
- Companies are archive/restore records. Archive blocks active attempts, disables autonomy and approved automations, and restore preserves original autonomy intent.

### People and governance

- Every company has durable CEO and ARM identities.
- ARM capability/capacity gap analysis, job-derived probationary hiring, dynamic identities/personas/system prompts/instructions, employment state transitions, performance evidence, claims, contradiction detection, incidents, and corrective action repositories exist.
- Human employee hire TUI creates an ARM-designed, human-approved probationary employee; profile editing, termination, and reinstatement preserve history.
- Offboarding blocks active attempts, releases unfinished task assignments, and reassigns reports.
- Recent commit: `2b40868 Add governed employee lifecycle workflows`.

### Conversations and integrations

- Rooms, threads, messages, pins, redaction, attachments, room membership, retention, announcements, mail bridge, MCP configuration/health receipts, project integrations, and scoped Beads support exist.
- Conversation-room create/edit/archive/restore TUI workflows are implemented and tested.
- Recent commit: `441e6c1 Add managed conversation room workflows`.

### Docker execution platform

- The Docker supervisor has durable attempts, leases, queue/capacity policy, memory-pressure reduction, emergency stop, bounded logs, timeout handling, artifact finalization, restart/orphan reconciliation, and no host fallback.
- The direct `alpine:3.22.1` universal image contains Kilo, OpenCode, Chromium, Node, Git, shell tools, CA certificates, and a rootless additive `workforce-toolchain` installer. A single private workspace volume can install combined Python, PHP/Composer/Laravel/Symfony, Go, Rust, document/PDF/office, image, audio/video, browser, and Beads bundles.
- The last verified agent image measured 468,959,095 bytes (< 500 MiB limit of 524,288,000 bytes). Rebuild before relying on that figure after image changes.
- Egress is audited through the internal proxy for approved work; secrets are encrypted, scope-checked, and injected without command-line exposure.

### Execution reality

Agents do run, not merely emit tick events:

1. `src/cli.tsx` creates `TaskExecutionService`, `DockerSupervisor`, CEO loop, automation service, and ARM loop.
2. Startup runs supervisor reconciliation and all loops; CEO/automation/ARM repeat every 10 seconds.
3. A ready/assigned task flows through `TaskExecutionService.start()` into a durable attempt and `DockerSupervisor.tick()`, which invokes Docker.
4. The supervisor re-ticks when a container finishes, refilling queue capacity.

The practical readiness dependency is intentional: a company must have a configured, verified model record. Default model registry entries are `unconfigured`, so a CEO cycle will record a blocked operating cycle rather than pretending work ran. Make model configuration/verification visibly manageable in the TUI and document it in the README.

### TUI quality

- Forms use opaque `FormFrame`/modal backdrops, so text behind a popup is not exposed.
- Navigation has explicit sidebar/content focus: arrows operate only on the focused surface, collapsed navigation transfers focus to content, and hidden regions cannot mutate state. One validated keybinding registry drives input and help text. Registered theme files drive shell/modal/status colors and appear in Settings.
- Company, organization, strategy, task, employee, agent profile, conversation room, MCP, integration, mail, automation, and meeting creation forms exist to varying degrees of completeness. Meeting create/edit/archive/restore is complete and tested.

### Project foundation

- `README.md` documents actual Docker execution readiness; `CONTRIBUTING.md`, `SECURITY.md`, and MIT `LICENSE` are present.
- GitHub CI runs quality gates on Node 22 and 24. Container verification builds images and runs sandbox checks on relevant changes.
- Recent commit: `d976655 Add meeting workflows and project foundations`.
- Navigation is grouped into seven focused areas; Tab changes area and j/k stays inside it. The documentation index and user guide replace duplicate short requirement notes. `docs/workforce-mcp.md` defines the external-admin and agent-scoped MCP delivery plan.

## Start here

First command after taking over:

```sh
git status --short
pnpm format
pnpm test
git diff --check
```

The latest verified committed baseline is `45e7280`; the navigation/docs/repository-organization slice immediately after it passes all 49 tests. Inspect the worktree before modifying it; preserve unrelated user changes.

## Remaining work, in recommended order

### 1. Finish execution readiness and observability

- Add independent model-verification action/receipt flow and real TUI create/edit/verification actions for environments and tools. Model registry create/edit is now available; configuration remains deliberately insufficient to claim verification.
- Add an explicit execution-readiness panel: Docker availability/image presence, egress proxy, model availability, active attempts/queue, and blocking reason.
- Verify the CEO, ARM, automation, supervisor, and restart/recovery loop using the compiled production TUI and a real Docker daemon. Do not accept event-only proof.
- Ensure periodic supervisor reconciliation/ticking is sufficiently robust while the app is live; test queued work arriving independently of a completion event.

### 2. Complete management workflows everywhere

Implement actual create/edit/archive/restore behavior (with confirmation and audits) for all navigation areas, not merely a view:

- conversations: room membership, thread create/edit/close/archive/restore, attachment workflow, message edit/redact/pin;
- meetings: action-item create/edit/complete/cancel and meeting start/adjourn/cancel actions;
- approvals, incidents, corrective actions, performance/recognition/warnings, claims/reviews;
- runtime registries: tools, environments, models/engines, Docker resource policy;
- mail lifecycle and message details;
- automation edit/approval/disable/restore; project integration scopes.

Avoid adding one giant overlay. Add focused repository methods, view files, forms, mutation overlay files, lifecycle mappings, and tests.

### 3. Close platform and security verification gaps

- Audit egress behavior against the final network policy and reconcile it carefully with `AGENTS.md`; do not make an assumption from a stale prompt.
- Verify actual proxy enforcement, proxy bypass denial, audit log preservation, private-volume access, no host mounts, secrets scope, Docker restart/orphan cleanup, retries/stalls, and no leftover containers against Docker—not only mocks.
- Add backup/export/restore commands and transactional corruption recovery tests. Document storage location, backup format, and restoration procedure.
- Add deterministic image build verification to CI; retain <500 MiB enforcement for every production image.

### 4. Finish product usability and documentation

- Replace README's generic product-state paragraph with a clear quickstart: install, build images, start TUI, create company, configure/verify model, approve task, observe Docker attempt, inspect evidence.
- Add an architecture diagram or concise system flow, operations/runbook guide, security model, migration policy, and release/versioning guide in `docs/`.
- Complete and verify GitHub CI workflows. CI should run format/lint/Knip/build/tests; image workflow should build and enforce size/isolation. Add CodeQL/dependency review only after confirming their workflow permissions and scope are correct.
- Keep `CONTRIBUTING.md`, `SECURITY.md`, MIT `LICENSE`, issue/PR templates, changelog/release policy, and `.gitignore` polished.

### 5. Final acceptance

Build an explicit 29-step (or equivalent exhaustive) production acceptance scenario. It must run through the compiled TUI, restart the app, and prove persisted evidence/identities, company isolation, end-to-end Docker execution, safety constraints, image sizes, no forbidden mounts/processes, and a clean git tree.

## Agent workflow to follow for every vertical slice

1. Inspect current state first: `git status --short`, affected repositories, forms, views, migrations, existing tests, docs, and `AGENTS.md`.
2. State the narrow slice and its acceptance evidence in a brief progress update.
3. Make domain/repository policy changes first. Keep durable mutations transactional and audited.
4. Add/revise SQL migration only if persistence changes.
5. Add the focused form/view/controller/lifecycle mapping. Use existing `FormFrame`, `ConfirmationDialog`, reusable panels, and maintained Ink packages.
6. Add unit tests for state/policy/repository constraints and integration/TUI tests for the actual workflow.
7. Update architecture/product/README documentation in the same slice.
8. Run exactly:

   ```sh
   pnpm format
   pnpm test
   git diff --check
   ```

9. Inspect the diff for dead code, duplicate helpers, huge files, stale docs, or compatibility facades. Delete or split them immediately.
10. Commit only the verified coherent slice. Do not claim completion just because tests are green; compare against this document and the product specification.

## OpenCode Ox Alpha prompt

Copy this prompt as the first instruction to the continuation agent:

```text
You are the principal engineer continuing Workforce in /Users/hsaddek/workplace/sdk-workspace/workforce. Read AGENTS.md, HANDOFF.md, docs/architecture.md, docs/product-specification.md, and docs/coding-standards.md completely before modifying code.

Your goal is not to make a narrow demo pass: complete the production-grade multi-company AI Workforce Operating System described in HANDOFF.md. Preserve Docker-only execution, company isolation, audited network/secret controls, forward-only SQL migrations, an Alpine universal sub-500MiB image, dynamic agent identities, and an organized Ink TUI with real confirmed management workflows.

Start by running: git status --short; pnpm format; pnpm test; git diff --check. The baseline includes grouped navigation, a user guide, a repository map, and a decision-complete Workforce MCP design. Continue with execution readiness, then implement the MCP boundary as a focused tested slice. Commit coherent, tested vertical slices.

For every slice: inspect relevant code/tests/docs; implement domain policy and repository methods before TUI; add migrations only as numbered SQL files; add test coverage for state transitions, company isolation, and the user workflow; update docs; run pnpm format && pnpm test && git diff --check; remove dead code; commit. Do not create god files, decorative placeholders, host execution fallbacks, insecure mounts, or compatibility facades without active callers and removal dates.

Do not claim the goal is complete until the full end-to-end compiled-production-TUI acceptance scenario proves Docker execution, model readiness, persistence after restart, multi-company isolation, artifacts/evidence, egress/secret restrictions, image size, no forbidden host mounts, all required TUI workflows, docs, CI, and a clean git tree. Use HANDOFF.md as the completion checklist and keep it updated after each meaningful slice.
```

## Evidence commands

```sh
pnpm test
pnpm build
pnpm doctor
pnpm images:build
pnpm sandbox:verify
git diff --check
git status --short
```

Run Docker-dependent commands only with Docker available. A failed Docker precondition is a visible blocked state, not a reason to add a fallback.
