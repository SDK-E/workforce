# Workforce

A standalone, Docker-first AI workforce control plane.

The host runs only the control plane: CEO and Agent Resources identities, task state, policy decisions, audit records, TUI, and Docker supervision. Agent engines and job workspaces run only inside job-specific containers. If Docker is unavailable, work is blocked visibly; the system never falls back to host execution.

## Product state

The local control plane uses transactional SQLite state with foreign keys, WAL durability, company isolation, durable CEO/ARM identities, typed organization and strategy hierarchies, tasks, rooms and messages, approvals, evidence, and a tamper-evident audit chain. The full-screen Ink interface remains usable when Docker is unavailable; execution never falls back to the host. Unimplemented workflows are identified explicitly and are not represented as working placeholders.

## Commands

- `pnpm install`
- `pnpm check`
- `pnpm test` (builds, then tests compiled JavaScript)
- `pnpm dead-code:check` (unused files, exports, and dependencies)
- `pnpm build && pnpm start` (production; compiled JavaScript only)
- `pnpm dev` (development TUI)
- `pnpm run doctor`
- `pnpm images:build`
- `pnpm sandbox:verify`
- `pnpm sandbox:plan -- requirements/job.json`
- `pnpm secrets:import -- github <company> [employee] [task]`
- `printf '%s' "$VERCEL_TOKEN" | pnpm secrets:import -- vercel <company> [employee] [task]`
- `pnpm tui` (production alias)

Node.js 22.13–26 and pnpm 10–11 are supported and checked explicitly. Dependency install scripts are denied unless individually allowlisted. The lockfile pins the dependency graph.

## TUI keys

Use arrows or `j`/`k` to navigate sections, `[`/`]` to select records, `n` to create, `e` to edit where supported, `d` to archive, and `u` to restore. Consequential lifecycle actions open an opaque confirmation dialog and preserve the record plus its audit history. Enter opens or confirms, `/` or `p` opens the command palette, `?` shows contextual help, and `q` quits. Docker status, active container capacity, pending decisions, and alerts remain visible in the top bar.

## Source organization

- `src/storage`: schema, persisted records, sanitization, and transactional state
- `src/tui/components`: reusable application chrome and controls
- `src/tui/views`: page-level workspaces
- `src/tui/overlays`: command palette, help, and confirmed modal workflows
- `src/acceptance`: independently testable completion policy
- `src/supervision`: durable attempts, leases, capacity policy, Docker supervision, and recovery

See [docs/coding-standards.md](docs/coding-standards.md). Formatting, typed linting, the 300-line module boundary, dead-code analysis, compilation, and tests are enforced by `pnpm test`; use `pnpm format` to apply formatting.

Docker Desktop or another compatible Docker daemon must be running before any agent attempt can start.

## Safety invariants

- No agent engine executes on the host.
- No agent receives the Docker socket.
- One container and one private job volume per attempt.
- Root filesystem is read-only; capabilities are dropped.
- Agent inference always uses the audited egress path; broader retrieval and engineering access is capability-scoped and logged.
- Secrets are never baked into images or task records.
- A zero exit code is not acceptance.
- Missing deliverables, step exhaustion, permission failures, and validation failures keep work incomplete.
- Hiring and employment changes are audited and reversible; records are never silently deleted.
