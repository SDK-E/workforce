# Architecture

## Trust boundary

The host is the trusted control plane. It stores organization identities, tasks, chats, policies, sandbox specifications, normalized activities, raw-event references, approvals, and audit events. It may invoke Docker only through a narrow runtime adapter.

Agent engines, model sessions, browser processes, package managers, build tools, shell commands, and job files live in per-attempt containers. Containers never receive the Docker socket. Inputs are copied into private Docker volumes; outputs are exported and validated after termination.

## Adaptive sandbox planner

The Agent Resources Manager must first turn a job into explicit requirements: risk, data sensitivity, capabilities, declared inputs, required outputs, network hosts, resources, engines, and acceptance criteria. The planner derives a sandbox profile and records every decision. It refuses contradictory capabilities rather than broadening permissions.

Profiles are starting points, not copied employee workspaces:

- Document: file output without shell or network.
- Research: public network through a future allowlisting proxy.
- Engineering: shell/build tools with no network by default.
- Browser: Playwright plus approved egress.
- Restricted review: no public network and no mutation beyond outputs.

## No host fallback

Docker unavailability is a blocked execution state. The control plane, TUI, CEO, ARM, task management, and conversations remain available; no agent work begins.

## Acceptance

Container completion is only an attempt result. Independent control-plane validation checks required outputs, manifests, tests, policy violations, step exhaustion, permission failures, and acceptance criteria before a task can close.

