# Workforce user guide

## 1. Prerequisites

Install Node.js 22.13–26, pnpm 10–11, and a compatible Docker daemon. Workforce never runs agent engines on the host. If Docker is unavailable, management remains usable but execution is visibly blocked.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm images:build
pnpm doctor
pnpm build
pnpm start
```

`pnpm images:build` builds the universal Alpine agent image and internal egress proxy, verifies both inference engine binaries, checks available mixed toolchain bundles, and rejects production images at or above 500 MiB.

## 2. Create and configure a company

On first launch, enter the company identity and mission. Workforce creates durable CEO and ARM identities. A single installation can manage multiple isolated companies; use **Overview → Companies** to create, select, edit, archive, or restore them.

Before agents can execute, configure a provider/model under **Platform → Models & engines**. Enter the environment-variable names required by that provider (for example `OPENAI_API_KEY`), select the record, and press `v`. Workforce retrieves only secrets authorized for that company, ARM identity, and verification task, then runs the configured engine and model inside the universal Docker image through audited egress. A bounded, redacted success or failure receipt is persisted. Configuration alone does not prove availability, and execution only selects a non-placeholder model with a successful independent receipt.

GitHub credentials can be imported from the authenticated `gh` CLI without mounting the host credential store:

```sh
pnpm secrets:import -- github COMPANY_ID EMPLOYEE_ID TASK_ID
```

Vercel tokens are accepted over protected standard input:

```sh
printf '%s' "$VERCEL_TOKEN" | pnpm secrets:import -- vercel COMPANY_ID EMPLOYEE_ID TASK_ID
```

## 3. Navigate the TUI

- `Tab` / `Shift-Tab`: move focus between the visible sidebar and dashboard content.
- `Ctrl-Tab` / `Ctrl-Shift-Tab`: switch navigation area.
- `j` / `k` or `Up` / `Down`: move within whichever surface is focused.
- `Left` / `Right`: change sidebar area; `Enter` enters dashboard content and `Escape` returns.
- `[` / `]`: select the previous or next record on a page.
- `n`: create a record where supported.
- `e`: edit or decide the selected record.
- `d` / `u`: request archive/restore where supported. Consequential actions require confirmation.
- `/` or `p`: open the global command palette.
- `r`: run a ready task from **Strategy & work → Tasks**.
- `v`: verify the selected supported integration.
- `!`: emergency-stop active and queued agent execution.
- `?`: keyboard help; `q`: quit.

The familiar VS Code-style bindings work too:

- `Ctrl-P`: open the command palette (as does `Ctrl-Shift-P`).
- `Ctrl-B`: show or hide the navigation sidebar.
- `Ctrl-,`: open settings.

Collapsing the sidebar with `Ctrl-B` transfers focus to dashboard content. Hidden navigation never receives arrow keys or mutation commands.

Themes are listed under **System → Settings**. Press `t` there to select the next registered theme, or set `WORKFORCE_THEME=high-contrast` before startup. See the [TUI customization guide](tui-customization.md) when adding themes or changing bindings.

Terminal applications cannot reliably distinguish every platform shortcut, so these bindings are additive: the single-key alternatives remain available and all text-entry dialogs retain normal editing behavior.

Only the pages in the current area appear in the sidebar. The command palette searches every area.
Use `Up` / `Down` to choose a palette result, `Enter` to open it directly in dashboard content, and `Escape` to close the palette without navigating.

## 4. Define work

Create measurable objectives, initiatives, projects, goals, and milestones under **Strategy & work**. Create a task with an objective, explicit acceptance criteria, risk, ownership, required tools, outputs, and model policy. Requirements are versioned; changes during active execution require a safe checkpoint.

The ARM evaluates whether an existing employee can do the work before proposing a probationary hire. A human can also create a governed hire from **Organization → Employees**. Dynamic persona, system prompt, instructions, sandbox, and probation criteria derive from the job rather than a hard-coded template.

## 5. Execute and inspect

An approved assigned task flows through the execution service into a durable Docker attempt. The supervisor provisions a private volume, injects only authorized secrets, routes network traffic through audited egress, starts the selected engine, captures bounded output, exports artifacts, and independently evaluates acceptance.

Use:

- **Overview → Executive overview** for registered identities versus actual active/queued Docker attempts. CEO and ARM identities exist even when no container is running.
- **Platform → Execution readiness** for concrete Docker, sandbox, model, autonomy, and queue blockers.
- **Strategy & work → Live work** for attempt state and blockers.
- **Strategy & work → Deliverables** for validated artifacts.
- **Governance → Audit** for durable decisions and mutations.
- **System → Advanced diagnostics** for raw normalized events.

A zero exit code alone never completes a task. Missing outputs, failed validators, unsupported claims, or unresolved critical findings remain incomplete.

## 6. Autonomous operation

While the control plane is running, CEO, ARM, and automation loops evaluate work every ten seconds. The CEO chooses or delegates company direction; the ARM fills verified capability/capacity gaps; approved automations create governed task runs. Every real agent attempt still passes through the same Docker, model, secret, and acceptance gates as a human-triggered run.

If events appear but agents do not start, inspect Docker status, image availability, the selected model's verification state, task assignment/status, approvals, secret scope, and operating-cycle failure reason.

## Agent Workforce MCP access

The local stdio MCP command is available today for trusted external clients. Container access additionally requires the forthcoming authenticated internal HTTP service. Once that service is deployed on the audited agent network, set `WORKFORCE_MCP_URL` to its HTTP/S endpoint before starting Workforce. Authorized attempts then receive the endpoint and a short-lived attempt token; the token is ephemeral, scoped to one company/employee/task/attempt, omitted from Docker command arguments and persistent state, and revoked when execution ends. Do not put credentials in `WORKFORCE_MCP_URL`; user information is stripped during validation.

## 7. Recovery and safety

On startup, Workforce expires stale leases and reconciles managed containers. Use `pnpm doctor` for Docker/image readiness and `pnpm sandbox:verify` for isolation checks. Emergency stop interrupts managed attempts without deleting task, employee, message, artifact, or audit history.
