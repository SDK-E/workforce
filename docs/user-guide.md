# Workforce user guide

## 1. Prerequisites

Install Node.js 22.13–26, pnpm 10–11, and a compatible Docker daemon. Workforce never runs agent engines on the host. If Docker is unavailable, management remains usable but execution is visibly blocked.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm images:build
pnpm doctor
pnpm start
pnpm tui
```

`pnpm images:build` builds the universal Alpine agent image and internal egress proxy, verifies both inference engine binaries, checks available mixed toolchain bundles, and rejects production images at or above 500 MiB.

## 2. Create and configure a company

On first launch, enter the company identity and mission. Workforce creates durable CEO and ARM identities. A single installation can manage multiple isolated companies; use **Overview → Companies** to create, select, edit, archive, or restore them.

Before agents can execute, configure a provider/model under **Platform → Models & engines**. Enter the environment-variable names required by that provider (for example `OPENAI_API_KEY`), select the record, and press `v`. Workforce retrieves only secrets authorized for that company, ARM identity, and verification task, then runs the configured engine and model inside the universal Docker image through audited egress. A bounded, redacted success or failure receipt is persisted. Configuration alone does not prove availability, and execution only selects a non-placeholder model with a successful independent receipt.

Use **Platform → Tools** and **Platform → Environments** to select, create, or edit the company-scoped capability registry. Press `n` to configure a new record and `e` to edit the selected row. Saving a new or changed registry record deliberately resets its health to `unknown` and removes its old verification receipt; configuration cannot impersonate a successful sandbox verification.

GitHub credentials can be imported from the authenticated `gh` CLI without mounting the host credential store:

```sh
pnpm secrets:import -- github COMPANY_ID EMPLOYEE_ID TASK_ID
```

Vercel tokens are accepted over protected standard input:

```sh
printf '%s' "$VERCEL_TOKEN" | pnpm secrets:import -- vercel COMPANY_ID EMPLOYEE_ID TASK_ID
```

Any credential can be stored the same way using a valid uppercase environment name. The value crosses protected standard input only; its name and company/employee/task scope are persisted, while its encrypted value is never placed in a command argument.

```sh
printf '%s' "$SERVICE_TOKEN" | pnpm secrets:import -- credential SERVICE_TOKEN COMPANY_ID EMPLOYEE_ID TASK_ID
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

The two-line bottom bar separates the latest system status from contextual keyboard guidance. It only lists actions implemented by the focused page; press `?` for the complete categorized keyboard reference. Read-only pages no longer advertise record selection or mutation keys.

Themes are listed under **System → Settings**. Press `t` there to select the next registered theme, or set `WORKFORCE_THEME=high-contrast` before startup. See the [TUI customization guide](tui-customization.md) when adding themes or changing bindings.

Terminal applications cannot reliably distinguish every platform shortcut, so these bindings are additive: the single-key alternatives remain available and all text-entry dialogs retain normal editing behavior.

Only the pages in the current area appear in the sidebar. The command palette searches every area.
Use `Up` / `Down` to choose a palette result, `Enter` to open it directly in dashboard content, and `Escape` to close the palette without navigating.

## 4. Define work

Create measurable objectives, initiatives, projects, goals, and milestones under **Strategy & work**. Create a task with an objective, explicit acceptance criteria, risk, ownership, required tools, outputs, and model policy. Requirements are versioned; changes during active execution require a safe checkpoint.

The ARM evaluates whether an existing employee can do the work before proposing a probationary hire. A human can also create a governed hire from **Organization → Employees**. Dynamic persona, system prompt, instructions, sandbox, and probation criteria derive from the job rather than a hard-coded template.

Every agent attempt also receives a freshly generated organizational briefing. Configure mission, vision, values, shareholder/governance information, and company policies by selecting the company under Companies and pressing `e`; the policies field accepts a JSON object so governance is company data rather than hard-coded product behavior. Maintain managers and organization units under Organization, and keep objectives, goals, milestones, projects, and task ownership current. Workforce combines that live state with the employee's versioned persona, responsibilities, reporting line, collaboration protocol, business-pipeline status, and task boundaries. The resulting digest is stored on the attempt so operators can prove which organizational context guided a run.

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

The CEO now chooses one bounded commercial phase from current company state: establish measurable direction, discover or research opportunities, qualify a lead, acquire a client, plan an engagement, or deliver and maintain an engagement. It creates ordinary accepted work rather than executing host commands. External contact requires a linked human approval unless the company policy explicitly lists `external-contact` under `autonomy.authorities`. Approving that decision resumes the same waiting task on the next cycle; restarts do not create replacements.

Open **Overview → CEO office** to see whether autonomy is enabled, the current runtime state, the latest durable action and rationale, its task, and any blocker. Use **Approvals** for authority decisions and **Conversations** or **Mail** for communication; CEO office is an operating-status page rather than a conversational prompt.

Open **Execution → Live work** for the agent workflow timeline. The summary shows the latest durable status for each agent attempt; the connected timeline below shows queued, lease, start, runtime, checkpoint, validation, recovery, and terminal events with time, employee, task, and attempt identity. Events come from the bounded durable attempt-event ledger and are company isolated, so the screen reflects actual supervisor history rather than simulated “running agent” counters.

The **Business** navigation area contains Opportunities, Leads, Clients, and Engagements. Each page supports selection plus confirmed create, edit, archive, and restore actions. Opportunities retain evidence and validation scores; leads retain qualification and source; clients preserve their originating lead; engagements attach delivery scope and measurable success criteria to a client. Parent references are validated inside the same company, and archived records remain recoverable for history and reporting.

If events appear but agents do not start, inspect Docker status, image availability, the selected model's verification state, task assignment/status, approvals, secret scope, and operating-cycle failure reason.

## Agent Workforce MCP access

The daemon serves authenticated Streamable HTTP at its internal `workforce-engine` network identity. Authorized attempts receive that endpoint and a short-lived token scoped to one company, employee, task, and attempt. Tokens are omitted from Docker command arguments and persistent state, checked against the live attempt record on every request, rate limited, and revoked when execution ends. Trusted external clients may still use the separate stdio command.

An agent can coordinate through joined rooms, mail, and meetings; checkpoint assigned work; submit evidence-backed claims; reference artifacts produced by its signed attempt; request a task approval; propose a typed automation for repetitive work; or request help and hand off durable context. Mutation calls require a unique idempotency key. Repeating the same request is safe, while reusing its key for changed arguments is rejected. These tools never grant access to another task or company.

CEO and ARM sessions discover management tools only when their signed capabilities allow them. The CEO can create measurable objectives and governed tasks, decide approvals, and delegate assignments. Workforce managers can assign work, request adaptive gap analysis and probationary hiring proposals, and apply valid employment-machine transitions. MCP cannot transition the durable CEO or ARM identity, cross company boundaries, or bypass an invalid lifecycle transition.

The CEO can also search and maintain its company's opportunities, leads, clients, and engagements through business MCP tools. These mutations validate company-scoped parent records, require replay-safe idempotency keys, retain archive history, and create MCP-origin audit events. The ARM receives read-only pipeline visibility; ordinary employees do not receive business-wide pipeline tools by default.

Company management authority can create and configure rooms, add validated company employees as members, and configure tool, environment, and model registry records. New or changed registry records always return to `unknown` health; only the independent Docker verifier can issue a health receipt. A CEO emergency stop is company-scoped and interrupts only that company's active attempts. The human TUI/control API emergency stop remains global.

The **Governance** pages accept human evidence without bypassing policy. Press `n` in Performance, Recognition, Warnings & incidents, or Critics & reviews to record an evidence-backed performance observation, recognition, incident, or claim. Every form requires evidence IDs, writes through the company-scoped governance repository, and appends an audit event. Conflicting claims are retained and marked disputed rather than silently overwritten.

On Warnings & incidents, `n` first lets you report an incident or draft an evidence-backed corrective action for an employee. Select either record and press `e` to advance it through only the transitions allowed by its XState lifecycle. Claim-ledger entries remain immutable evidence records: `d` retracts the selected claim and `u` restores it after confirmation. Workforce then reconciles all active claims for the same subject and predicate, so removing a contradiction returns the remaining claim to asserted status while restoring it marks both sides disputed again.

In the TUI, approval, automation, and hiring-proposal decisions operate on the highlighted row: move focus to content, use `[` and `]` or the configured record-navigation arrows, then press `e`. The decision dialog is pre-bound to that record, requires an evidence-based rationale, and confirms before mutation. Users never need to copy opaque record IDs from the screen.

## 7. Recovery and safety

`pnpm stop` stops the daemon but preserves `workforce-state`; the next `pnpm start` reuses the database, encrypted secrets, artifacts, and control identity. On startup, Workforce expires stale leases and reconciles managed containers. `pnpm reset` is intentionally destructive: it stops the stack and removes the named state volume, deleting every company and its history. Use `pnpm doctor` for Docker/image readiness and `pnpm sandbox:verify` for isolation checks. Emergency stop interrupts managed attempts without deleting task, employee, message, artifact, or audit history.
