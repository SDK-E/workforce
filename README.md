# Workforce

A standalone, Docker-first operating system for autonomous AI companies.

Each isolated company has a durable CEO that chooses and delegates direction and an Agent Resources Manager that builds and reinforces the workforce. The intended company can continuously discover opportunities, generate leads, handle clients, build and operate production-grade applications and other professional deliverables, and maintain its own operations. The host runs only the control plane; agent engines and job workspaces run only inside job-specific containers. If Docker is unavailable, work is blocked visibly and never falls back to host execution.

## What it does

The local control plane uses transactional SQLite state with foreign keys, WAL durability, company isolation, durable CEO/ARM identities, typed organization and strategy hierarchies, tasks, dynamic agents, rooms and messages, approvals, evidence, and a tamper-evident audit chain. The full-screen Ink interface remains usable when Docker is unavailable; execution never falls back to the host.

## Quick start

1. Install a supported Node.js release and pnpm, then run `pnpm install --frozen-lockfile`.
2. Build and verify the universal agent image with `pnpm images:build`.
3. Run `pnpm start` to build and start the persistent Dockerized Workforce daemon, then open the separate interface with `pnpm tui`.
4. Create or select a company, then use **Models & engines** to configure a model registry entry and complete its independent verification before requesting work. Default model records are deliberately unconfigured, so CEO/automation cycles will record a blocked decision instead of launching an undefined provider.
5. Create an objective and task, assign an eligible employee, approve it, then use `r` in **Tasks** to request a Docker attempt. Inspect **Live work**, **Deliverables**, and **Audit** for durable evidence.

CEO, ARM, and approved automation loops run every ten seconds while the control plane is running. They create durable operating-cycle records and route approved work into the same Docker supervisor used by the TUI. A verified model, Docker daemon, and any required scoped credentials remain mandatory prerequisites for an attempt to launch.

## Commands

These are the everyday operator commands:

- `pnpm start` — start or resume the persistent company engine.
- `pnpm tui` — open the operator interface.
- `pnpm status` — check whether the engine is running.
- `pnpm logs` — follow engine activity and failures.
- `pnpm stop` — stop the engine while preserving all state.
- `pnpm reset` — permanently erase every company and the complete state volume.

Installation, image building, secret administration, diagnostics, MCP clients, and contributor
checks are documented in the [detailed user guide](docs/user-guide.md) and
[contribution guide](CONTRIBUTING.md); they are intentionally not mixed into the daily workflow.

The daemon persists companies, secrets, audit history, and artifacts in the `workforce-state`
named volume. Container-scoped Workforce MCP uses its authenticated internal endpoint; attempt
tokens are short-lived and never persisted.

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

Start with the [TUI getting-started guide](docs/tui-getting-started.md). The [documentation index](docs/README.md) links the detailed user guide, repository map, architecture, and product specification. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules and [SECURITY.md](SECURITY.md) for private vulnerability reporting. The project is available under the [MIT License](LICENSE).

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
