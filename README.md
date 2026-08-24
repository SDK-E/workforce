# Workforce

A standalone, Docker-first AI workforce control plane.

The host runs only the control plane: CEO and Agent Resources identities, task state, policy decisions, audit records, TUI, and Docker supervision. Agent engines and job workspaces run only inside job-specific containers. If Docker is unavailable, work is blocked visibly; the system never falls back to host execution.

## Current phase

This repository contains the clean control-plane foundation, adaptive sandbox planner, Docker command builder, durable append-only state, CEO/ARM bootstrap, health diagnostics, and human-readable TUI. It starts with zero tasks and does not import the archived SDK experiment.

## Commands

- `pnpm install`
- `pnpm check`
- `pnpm test`
- `pnpm run doctor`
- `pnpm images:build`
- `pnpm sandbox:verify`
- `pnpm sandbox:plan -- requirements/job.json`
- `pnpm tui`

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
