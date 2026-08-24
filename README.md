# Workforce

A standalone, Docker-first AI workforce control plane.

The host runs only the control plane: CEO and Agent Resources identities, task state, policy decisions, audit records, TUI, and Docker supervision. Agent engines and job workspaces run only inside job-specific containers. If Docker is unavailable, work is blocked visibly; the system never falls back to host execution.

## Product foundation

The local control plane uses transactional SQLite state with foreign keys, WAL durability, company isolation, durable CEO/ARM identities, persistent rooms and messages, approvals, evidence, generic organization/project entities, and a tamper-evident audit chain. The full-screen Ink interface remains usable when Docker is unavailable; execution never falls back to the host.

## Commands

- `pnpm install`
- `pnpm check`
- `pnpm test` (builds, then tests compiled JavaScript)
- `pnpm build && pnpm start` (production; compiled JavaScript only)
- `pnpm dev` (development TUI)
- `pnpm run doctor`
- `pnpm images:build`
- `pnpm sandbox:verify`
- `pnpm sandbox:plan -- requirements/job.json`
- `pnpm tui` (production alias)

Node.js 22.13–26 and pnpm 10–11 are supported and checked explicitly. Dependency install scripts are denied unless individually allowlisted. The lockfile pins the dependency graph.

## TUI keys

Use arrows or `j`/`k` to navigate, Enter to open, `/` or `p` for the command palette, `?` for contextual help, and `q` to quit. Docker status, active container capacity, pending decisions, and alerts remain visible in the top bar.

Docker Desktop or another compatible Docker daemon must be running before any agent attempt can start.

## Safety invariants

- No agent engine executes on the host.
- No agent receives the Docker socket.
- One container and one private job volume per attempt.
- Root filesystem is read-only; capabilities are dropped.
- Network is disabled unless explicit requirements justify an approved profile.
- Secrets are never baked into images or task records.
- A zero exit code is not acceptance.
- Missing deliverables, step exhaustion, permission failures, and validation failures keep work incomplete.
- Hiring and employment changes are audited and reversible; records are never silently deleted.
