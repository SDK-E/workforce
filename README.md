# Workforce

A standalone, Docker-first operating system for autonomous AI companies.

Each isolated company has a durable CEO that chooses and delegates direction and an Agent Resources Manager that builds and reinforces the workforce. The intended company can continuously discover opportunities, generate leads, handle clients, build and operate production-grade applications and other professional deliverables, and maintain its own operations. The host runs only the control plane; agent engines and job workspaces run only inside job-specific containers. If Docker is unavailable, work is blocked visibly and never falls back to host execution.

## What it does

The local control plane uses transactional SQLite state with foreign keys, WAL durability, company isolation, durable CEO/ARM identities, typed organization and strategy hierarchies, tasks, dynamic agents, rooms and messages, approvals, evidence, and a tamper-evident audit chain. The full-screen Ink interface remains usable when Docker is unavailable; execution never falls back to the host.

## Quick start

1. Install a supported Node.js release and pnpm, then run `pnpm install --frozen-lockfile`.
2. Build and verify the sandbox images with `pnpm images:build`.
3. Start the production TUI with `pnpm build && pnpm start`.
4. Create or select a company, then use **Models & engines** to configure a model registry entry and complete its independent verification before requesting work. Default model records are deliberately unconfigured, so CEO/automation cycles will record a blocked decision instead of launching an undefined provider.
5. Create an objective and task, assign an eligible employee, approve it, then use `r` in **Tasks** to request a Docker attempt. Inspect **Live work**, **Deliverables**, and **Audit** for durable evidence.

CEO, ARM, and approved automation loops run every ten seconds while the control plane is running. They create durable operating-cycle records and route approved work into the same Docker supervisor used by the TUI. A verified model, Docker daemon, and any required scoped credentials remain mandatory prerequisites for an attempt to launch.

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
- `pnpm workforce:mcp -- /absolute/path/to/principal-config.json` (company-scoped stdio MCP)
- `pnpm tui` (production alias)

Container-scoped Workforce MCP credentials are issued when `WORKFORCE_MCP_URL` names an authenticated internal endpoint. The internal Streamable HTTP transport is still an explicit remaining delivery slice; stdio is the currently operational transport.

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

Start with the [documentation index](docs/README.md), [user guide](docs/user-guide.md), and [repository map](docs/repository-map.md). Read [docs/architecture.md](docs/architecture.md) for system boundaries, [docs/product-specification.md](docs/product-specification.md) for requirements, [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules, and [SECURITY.md](SECURITY.md) for private vulnerability reporting. The project is available under the [MIT License](LICENSE).

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
